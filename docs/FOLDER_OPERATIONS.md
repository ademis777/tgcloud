# Folder operations

Rename a folder with the pencil icon. The owner-only `folders_update_own` RLS policy
allows editing its name; files, child folders and Telegram data are untouched.

Delete uses `public.delete_folder_keep_contents(p_folder_id uuid)`.
It is a single atomic transaction. It locks the requested folder, verifies `auth.uid()`
matches the owning user, then moves its DIRECT files and subfolders to the parent.
Subfolder descendants remain intact. It deletes only the now-empty folder. If the
parent is the root, contents become root-level items. No Telegram API deletion or
change to original Telegram messages occurs.

Only authenticated callers have EXECUTE on the SECURITY DEFINER RPC, and its queries
are explicitly constrained by the verified account ID. If any operation fails, the
transaction rolls back without losing files or folders.
