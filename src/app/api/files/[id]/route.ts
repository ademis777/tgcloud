import { adminDb, failure, requireUser, unauthorized } from "@/lib/server";
import { decryptToken } from "@/lib/secrets";
import { fetchTelegramFile } from "@/lib/telegram";
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
    const upstream = await fetchTelegramFile(decryptToken(connection.token_ciphertext), f.tg_file_id);
    return new Response(upstream.body, { headers: {
      "Content-Type": f.mime_type || "application/octet-stream",
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
    const db = adminDb();
    const { data: f } = await db.from("files").select("storage_path").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!f) return failure("File not found.", 404);
    if (f.storage_path) {
      const { error } = await db.storage.from("pending-files").remove([f.storage_path]);
      if (error) return failure("Could not clean the private staging copy.", 500);
    }
    const { error } = await db.from("files").delete().eq("id", id).eq("user_id", user.id);
    if (error) return failure("Could not remove catalog entry.", 500);
    return Response.json({ removedFromCatalog: true, telegramCopyMayRemain: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("Could not update file catalog.", 500);
  }
}
