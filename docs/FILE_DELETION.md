# File deletion semantics (Telegram-backed storage)

DELETE `/api/files/:id` first verifies ownership, reads the file's original Telegram
bot/channel/message identifiers, then asks Telegram `deleteMessage`. The catalog entry
is deleted **only after Telegram confirms success**. For uncommitted staging-only
files, deletion removes the private staging copy and catalog entry.

Telegram Bot API limits `deleteMessage` to messages under **48 hours old**:
https://core.telegram.org/bots/api#deletemessage

If Telegram cannot confirm deletion (expired window, revoked permission, lost original
bot token, unavailable API), the catalog entry remains so the user does not mistake
an index-only deletion for physical removal. A separately confirmed
`DELETE /api/files/:id?catalogOnly=1` deliberately removes only the catalog entry,
and explicitly warns that the message may remain in Telegram. For older messages,
delete manually in Telegram first and then remove the TG-Cloud catalog entry.

The file stores `tg_chat_id` and `tg_bot_id` alongside `tg_message_id` to protect
against deleting an unrelated message after a bot/channel reconnect. Migration 0003
backfills only when the current connection predates the file creation.
A successful Telegram deletion followed by a rare catalog DB failure needs manual
reconciliation: inspect the channel, then use catalog-only deletion.

Do not claim removal of all Telegram caches, other users' forwarded/downloaded copies,
or platform backups.
