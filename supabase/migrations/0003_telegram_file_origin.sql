-- Record original bot/channel for safe deletion even if a user later reconnects storage.
alter table public.files add column if not exists tg_chat_id text;
alter table public.files add column if not exists tg_bot_id bigint;
-- Safely backfill legacy entries only when today's connection was created before the file.
-- For older entries after a reconnect, leave origin unknown rather than risk deleting
-- another message with the same ID in a different channel.
update public.files as f
set tg_chat_id = bc.channel_id, tg_bot_id = bc.bot_id
from public.bot_connections as bc
where f.user_id = bc.user_id and f.tg_message_id is not null
  and f.tg_chat_id is null and f.tg_bot_id is null
  and bc.updated_at <= f.created_at;
