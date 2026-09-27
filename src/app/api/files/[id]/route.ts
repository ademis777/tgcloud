import { adminDb, failure, requireUser, unauthorized } from "@/lib/server";
import { decryptToken } from "@/lib/secrets";
import { fetchTelegramFile, telegramCall } from "@/lib/telegram";
import { telegramDeletionTarget } from "@/lib/file-deletion";
import { previewDescriptor } from "@/lib/file-preview";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    if (!user) return unauthorized();
    const { id } = await context.params;
    const db = adminDb();
    const { data: f } = await db.from("files").select("name,mime_type,size_bytes,tg_file_id,status")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!f || f.status !== "ready" || !f.tg_file_id) return failure("File not found.", 404);
    if (f.size_bytes > 8 * 1024 * 1024) return failure("Large-file download worker is not yet configured.", 501);
    const { data: connection } = await db.from("bot_connections").select("token_ciphertext").eq("user_id", user.id).maybeSingle();
    if (!connection) return failure("Telegram connection unavailable.", 409);
    const preview = new URL(request.url).searchParams.get("view") === "1";
    const descriptor = previewDescriptor(f.mime_type, f.name);
    if (preview && descriptor.kind === "unsupported") return failure("Preview is unavailable for this type.", 415);
    const upstream = await fetchTelegramFile(decryptToken(connection.token_ciphertext), f.tg_file_id);
    return new Response(upstream.body, { headers: {
      "Content-Type": preview ? descriptor.contentType : (f.mime_type || "application/octet-stream"),
      "Content-Disposition": "attachment; filename=\"download\"; filename*=UTF-8''" + encodeURIComponent(f.name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return failure("File could not be downloaded.", 502);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    if (!user) return unauthorized();
    const { id } = await context.params;
    const catalogOnly = new URL(request.url).searchParams.get("catalogOnly") === "1";
    const db = adminDb();
    const { data: f, error: lookupError } = await db.from("files")
      .select("storage_path,status,tg_message_id,tg_chat_id,tg_bot_id")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (lookupError) return failure("Could not read the file record.", 500);
    if (!f) return failure("File not found.", 404);

    let target: ReturnType<typeof telegramDeletionTarget> = { kind: "none" };
    let connection: { bot_id: number | string; token_ciphertext: string } | null = null;
    if (!catalogOnly) {
      const result = await db.from("bot_connections").select("bot_id,token_ciphertext")
        .eq("user_id", user.id).maybeSingle();
      if (result.error) return failure("Could not verify the Telegram connection.", 500);
      connection = result.data;
      target = telegramDeletionTarget(f, connection);
      if (target.kind === "error") {
        const reason = target.reason === "bot-changed" || target.reason === "connection-missing"
          ? "The original storage bot is no longer connected."
          : "The original Telegram message cannot be safely identified.";
        return failure(reason + " The file remains in your catalog. Reconnect the original bot, or delete the Telegram message manually and explicitly choose catalog-only removal.", 409);
      }
    }
    // Clean up any private temporary copy while the catalog still records the file.
    if (f.storage_path) {
      const { error } = await db.storage.from("pending-files").remove([f.storage_path]);
      if (error) return failure("Could not clean the private staging copy. The file record was kept.", 500);
    }
    let telegramDeleted = false;
    if (target.kind === "target" && connection) {
      try {
        const confirmed = await telegramCall<boolean>(decryptToken(connection.token_ciphertext), "deleteMessage", {
          chat_id: target.chatId,
          message_id: target.messageId,
        });
        if (confirmed !== true) throw new Error("Telegram did not confirm deletion.");
        telegramDeleted = true;
      } catch {
        return failure(
          "Telegram did not confirm deletion. Messages older than 48 hours or missing bot permissions cannot be deleted through the Bot API. The catalog entry was kept. Check the channel before using catalog-only removal.",
          409
        );
      }
    }
    const { error } = await db.from("files").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      return failure(telegramDeleted
        ? "Telegram deletion succeeded, but the catalog update failed. Refresh and use catalog-only removal after checking the channel."
        : "Could not remove the catalog entry.", 500);
    }
    return Response.json({
      removedFromCatalog: true,
      telegramDeleted,
      catalogOnly,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("Could not process file deletion. The catalog entry may still be present; refresh before retrying.", 500);
  }
}
