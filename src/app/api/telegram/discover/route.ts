import { failure, requireUser, unauthorized } from "@/lib/server";
import { telegramCall, type BotInfo, type ChannelUpdate } from "@/lib/telegram";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!(await requireUser(request))) return unauthorized();
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^\d{5,15}:[A-Za-z0-9_-]{20,}$/.test(token) || token.length > 256) return failure("Invalid bot token format.");
    const bot = await telegramCall<BotInfo>(token, "getMe");
    if (!bot.is_bot) return failure("Telegram account is not a bot.");
    const updates = await telegramCall<ChannelUpdate[]>(token, "getUpdates", { timeout: 0, allowed_updates: '["channel_post"]' });
    const seen = new Map<string, string>();
    updates.forEach((u) => {
      const c = u.channel_post?.chat;
      if (c && ["channel", "supergroup"].includes(c.type)) seen.set(String(c.id), c.title || String(c.id));
    });
    return Response.json({ bot: bot.username, channels: Array.from(seen, ([id, title]) => ({ id, title })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Could not discover Telegram channels.", 502);
  }
}
