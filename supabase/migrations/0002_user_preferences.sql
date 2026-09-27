-- Save a user-selected account language across devices. No public/anonymous access.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null check (locale in ('en','fr','es','de','uk','ru')),
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from anon;
grant select, insert, update on public.user_preferences to authenticated;
drop policy if exists "preferences_select_own" on public.user_preferences;
drop policy if exists "preferences_insert_own" on public.user_preferences;
drop policy if exists "preferences_update_own" on public.user_preferences;
create policy "preferences_select_own" on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "preferences_insert_own" on public.user_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "preferences_update_own" on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
