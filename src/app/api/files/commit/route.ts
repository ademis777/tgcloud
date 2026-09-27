import { adminDb, failure, requireUser, unauthorized } from "@/lib/server";
import { decryptToken } from "@/lib/secrets";
import { sendDocument } from "@/lib/telegram";
export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const path = typeof body.path === "string" ? body.path : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const folderId = body.folderId === null || body.folderId === undefined ? null : String(body.folderId);
    const prefix = user.id + "/";
    if (!path.startsWith(prefix) || !/^[0-9a-f-]{36}\/[^/]+$/i.test(path.slice(prefix.length))) return failure("Invalid staging file path.");
    if (!name || name.length > 255 || /[/\\\u0000-\u001f]/.test(name)) return failure("Invalid filename.");
    const db = adminDb();
    if (folderId) {
      const { data: folder } = await db.from("folders").select("id").eq("id", folderId).eq("user_id", user.id).maybeSingle();
      if (!folder) return failure("Folder not found.", 404);
    }
    const { data: connection } = await db.from("bot_connections").select("channel_id, bot_id, token_ciphertext").eq("user_id", user.id).maybeSingle();
    if (!connection) return failure("Connect your Telegram storage first.", 409);
    const { data: blob, error: downloadError } = await db.storage.from("pending-files").download(path);
    if (downloadError || !blob) return failure("Staged file not found.", 404);
    if (blob.size > MAX_BYTES) return failure("This first release supports files up to 8 MiB.", 413);
    const mime = blob.type || "application/octet-stream";
    const { data: record, error: insertError } = await db.from("files").insert({
      user_id: user.id, folder_id: folderId, name, mime_type: mime,
      size_bytes: blob.size, storage_path: path, status: "pending",
    }).select("id").single();
    if (insertError || !record) return failure("Could not index staged file.", 500);
    try {
      const sent = await sendDocument(decryptToken(connection.token_ciphertext), connection.channel_id, blob, name);
      if (!sent.document?.file_id) throw new Error("Telegram did not return a document ID.");
      const { error: updateError } = await db.from("files").update({
        tg_file_id: sent.document.file_id, tg_message_id: sent.message_id,
        tg_chat_id: connection.channel_id, tg_bot_id: connection.bot_id,
        status: "ready", last_error: null,
      }).eq("id", record.id).eq("user_id", user.id);
      if (updateError) return failure("File reached Telegram but its catalog update needs reconciliation. Do not upload it again.", 500);
      const { error: cleanupError } = await db.storage.from("pending-files").remove([path]);
      if (!cleanupError) await db.from("files").update({ storage_path: null }).eq("id", record.id).eq("user_id", user.id);
      return Response.json({ id: record.id, status: "ready" }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Telegram upload failed.";
      await db.from("files").update({ status: "failed", last_error: message.slice(0, 300) }).eq("id", record.id).eq("user_id", user.id);
      return failure("Telegram upload failed; a private staging copy remains for recovery. " + message, 502);
    }
  } catch {
    return failure("Could not process upload.", 500);
  }
}
