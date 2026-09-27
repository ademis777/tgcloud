-- TG-Cloud 2.0. Run in a new Supabase project. Enforce per-user isolation.
create extension if not exists pgcrypto;

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid,
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (parent_id, user_id) references public.folders(id, user_id) on delete cascade,
  check (parent_id is distinct from id)
);
create index if not exists folders_user_parent_idx on public.folders (user_id, parent_id);

create table if not exists public.bot_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bot_id bigint not null,
  bot_username text not null,
  channel_id text not null,
  channel_title text,
  token_ciphertext text not null,
  updated_at timestamptz not null default now()
);
-- Deliberately NO authenticated-user policies. The service role is the only reader.
alter table public.bot_connections enable row level security;
revoke all on public.bot_connections from anon, authenticated;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid,
  name text not null check (length(name) between 1 and 255),
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes >= 0),
  storage_path text,
  tg_file_id text,
  tg_message_id bigint,
  status text not null default 'pending' check (status in ('pending','ready','failed')),
  last_error text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (folder_id, user_id) references public.folders(id, user_id) on delete set null (folder_id)
);
create index if not exists files_user_created_idx on public.files(user_id, created_at desc);

alter table public.folders enable row level security;
alter table public.files enable row level security;
drop policy if exists "folders_select_own" on public.folders;
drop policy if exists "folders_insert_own" on public.folders;
drop policy if exists "folders_update_own" on public.folders;
drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_select_own" on public.folders for select to authenticated using (user_id = (select auth.uid()));
create policy "folders_insert_own" on public.folders for insert to authenticated with check (user_id = (select auth.uid()));
create policy "folders_update_own" on public.folders for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "folders_delete_own" on public.folders for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists "files_select_own" on public.files;
create policy "files_select_own" on public.files for select to authenticated using (user_id = (select auth.uid()));
-- No client write policy on files. Server validates auth and performs all mutations.

insert into storage.buckets (id, name, public, file_size_limit)
values ('pending-files', 'pending-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;
drop policy if exists "pending_insert_own" on storage.objects;
drop policy if exists "pending_select_own" on storage.objects;
create policy "pending_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'pending-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pending_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'pending-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Staging deletion is performed by the trusted server after committing to Telegram.
