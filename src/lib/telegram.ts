import "server-only";

type TelegramReply<T> = { ok: boolean; result?: T; description?: string };
export type BotInfo = { id: number; username?: string; is_bot: boolean };
export type ChatInfo = { id: number; title?: string; type: string };
export type ChatMember = { status: string; can_post_messages?: boolean };
export type ChannelUpdate = { update_id: number; channel_post?: { chat: ChatInfo } };
import { type SentMedia } from "./telegram-media";
export { sentMediaFileId } from "./telegram-media";
export type TelegramFile = { file_path?: string; file_size?: number };

function botUrl(token: string, method: string): string {
  return "https://api.telegram.org/bot" + token + "/" + method;
}
async function decode<T>(response: Response): Promise<T> {
  const raw = (await response.json()) as TelegramReply<T>;
  if (!response.ok || !raw.ok || raw.result === undefined) {
    throw new Error(raw.description || "Telegram rejected the request.");
  }
  return raw.result;
}
export async function telegramCall<T>(token: string, method: string, params: Record<string, string | number> = {}): Promise<T> {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => body.set(k, String(v)));
  const r = await fetch(botUrl(token, method), {
    method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  return decode<T>(r);
}
export async function sendDocument(token: string, chatId: string, contents: Blob, name: string): Promise<SentMedia> {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("document", contents, name);
  const r = await fetch(botUrl(token, "sendDocument"), {
    method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(90000),
  });
  return decode<SentMedia>(r);
}
export async function fetchTelegramFile(token: string, fileId: string): Promise<Response> {
  const f = await telegramCall<TelegramFile>(token, "getFile", { file_id: fileId });
  if (!f.file_path || f.file_path.startsWith("/") || f.file_path.split("/").includes("..")) {
    throw new Error("Invalid Telegram file path.");
  }
  const encoded = f.file_path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch("https://api.telegram.org/file/bot" + token + "/" + encoded, {
    cache: "no-store", signal: AbortSignal.timeout(60000),
  });
  if (!response.ok || !response.body) throw new Error("Telegram download failed.");
  return response;
}
