-- Delete a folder without deleting any file or subfolder. Rename uses owner RLS.
-- Atomic, account-scoped RPC. All descendants retain hierarchy; direct children move up.
create or replace function public.delete_folder_keep_contents(p_folder_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_parent uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  select parent_id into v_parent from public.folders
    where id = p_folder_id and user_id = v_user_id for update;
  if not found then
    raise exception 'Folder not found.' using errcode = 'P0002';
  end if;
  update public.folders set parent_id = v_parent
    where user_id = v_user_id and parent_id = p_folder_id;
  update public.files set folder_id = v_parent
    where user_id = v_user_id and folder_id = p_folder_id;
  delete from public.folders where id = p_folder_id and user_id = v_user_id;
  if not found then
    raise exception 'Folder deletion failed.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.delete_folder_keep_contents(uuid) from public, anon;
grant execute on function public.delete_folder_keep_contents(uuid) to authenticated;
