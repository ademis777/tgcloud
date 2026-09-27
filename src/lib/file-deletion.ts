/** Pure safety checks before asking Telegram to delete a stored file message. */
export type TelegramDeletionFile = {
  status: "pending" | "ready" | "failed";
  tg_message_id: number | string | null;
  tg_chat_id: string | null;
  tg_bot_id: number | string | null;
};
export type TelegramDeletionConnection = { bot_id: number | string } | null;
export type TelegramDeletionTarget =
  | { kind: "none" }
  | { kind: "error"; reason: "missing-message" | "unknown-origin" | "connection-missing" | "bot-changed" | "invalid-message" }
  | { kind: "target"; chatId: string; messageId: number };

export function telegramDeletionTarget(
  file: TelegramDeletionFile,
  connection: TelegramDeletionConnection
): TelegramDeletionTarget {
  if (file.tg_message_id === null) {
    return file.status === "ready" ? { kind: "error", reason: "missing-message" } : { kind: "none" };
  }
  if (!file.tg_chat_id || !file.tg_bot_id) return { kind: "error", reason: "unknown-origin" };
  if (!/^-?\d{6,20}$/.test(file.tg_chat_id)) return { kind: "error", reason: "unknown-origin" };
  const id = Number(file.tg_message_id);
  if (!Number.isSafeInteger(id) || id < 1) return { kind: "error", reason: "invalid-message" };
  if (!connection) return { kind: "error", reason: "connection-missing" };
  if (String(file.tg_bot_id) !== String(connection.bot_id)) return { kind: "error", reason: "bot-changed" };
  return { kind: "target", chatId: file.tg_chat_id, messageId: id };
}
