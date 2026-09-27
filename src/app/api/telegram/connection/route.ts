import { adminDb, failure, requireUser, unauthorized } from "@/lib/server";
import { encryptToken } from "@/lib/secrets";
import { telegramCall, type BotInfo, type ChatInfo, type ChatMember } from "@/lib/telegram";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return unauthorized();
    const { data, error } = await adminDb().from("bot_connections")
      .select("bot_username, channel_id, channel_title, updated_at").eq("user_id", user.id).maybeSingle();
    if (error) return failure("Database connection failed.", 500);
    return Response.json({ connected: Boolean(data), connection: data || null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("Server is not configured.", 503);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return unauthorized();
    const payload = await request.json();
    const token = typeof payload.token === "string" ? payload.token.trim() : "";
    const channelId = typeof payload.channelId === "string" ? payload.channelId.trim() : "";
    if (!/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(token) || token.length > 256) return failure("Invalid Telegram bot token.");
    if (!/^-?\d{6,20}$/.test(channelId)) return failure("Enter a numeric Telegram channel ID (e.g. -100...).");
    const bot = await telegramCall<BotInfo>(token, "getMe");
    const chat = await telegramCall<ChatInfo>(token, "getChat", { chat_id: channelId });
    if (!["channel", "supergroup"].includes(chat.type)) return failure("Storage must be a private channel or supergroup.");
    const member = await telegramCall<ChatMember>(token, "getChatMember", { chat_id: channelId, user_id: bot.id });
    if (member.status !== "administrator" && member.status !== "creator") return failure("Add your bot as an administrator of the channel.");
    if (chat.type === "channel" && member.status !== "creator" && member.can_post_messages !== true) return failure("Allow the bot to post messages to the channel.");
    const { error } = await adminDb().from("bot_connections").upsert({
      user_id: user.id, bot_id: bot.id, bot_username: bot.username || String(bot.id),
      channel_id: String(chat.id), channel_title: chat.title || "", token_ciphertext: encryptToken(token),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return failure("Could not save the connection.", 500);
    return Response.json({ connected: true, connection: { bot_username: bot.username, channel_id: String(chat.id), channel_title: chat.title || "" } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Connection failed.", 502);
  }
}
