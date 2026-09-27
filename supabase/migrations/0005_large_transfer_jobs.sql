-- Phase 1 foundation: metadata only. This migration DOES NOT enable 2 GB uploads,
-- increase the existing bucket limit, or start an external worker.
create table if not exists public.large_transfer_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid,
  name text not null check (length(trim(name)) between 1 and 255),
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes between 1 and 2000000000),
  bytes_uploaded bigint not null default 0 check (bytes_uploaded >= 0 and bytes_uploaded <= size_bytes),
  -- A server-controlled staging key, not an authenticated/public download URL.
  staging_path text unique,
  state text not null default 'created'
    check (state in ('created','uploading','staged','sending','ready','failed','canceled')),
  file_id uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (folder_id, user_id) references public.folders(id,user_id)
    on delete set null (folder_id),
  foreign key (file_id, user_id) references public.files(id,user_id)
    on delete set null (file_id),
  check (state <> 'ready' or file_id is not null),
  check (state <> 'staged' or bytes_uploaded = size_bytes)
);
create index if not exists large_transfer_jobs_user_created_idx
  on public.large_transfer_jobs(user_id, created_at desc);
create index if not exists large_transfer_jobs_worker_idx
  on public.large_transfer_jobs(state, updated_at)
  where state in ('staged','sending');
alter table public.large_transfer_jobs enable row level security;
revoke all on public.large_transfer_jobs from anon;
-- Clients may see their own progress, but never create or forge a ready job.
revoke insert, update, delete on public.large_transfer_jobs from authenticated;
grant select on public.large_transfer_jobs to authenticated;
drop policy if exists "large_transfer_jobs_select_own" on public.large_transfer_jobs;
create policy "large_transfer_jobs_select_own" on public.large_transfer_jobs
  for select to authenticated using (user_id=(select auth.uid()));
