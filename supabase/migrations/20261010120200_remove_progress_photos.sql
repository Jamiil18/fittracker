-- Progress photos were removed from the app: the table, its pose type and the
-- private storage bucket go, with every policy that guarded them.
--
-- The bucket must be emptied through the Storage API (the dashboard) before
-- this runs. Deleting files with SQL would leave them orphaned in the storage
-- backend, which is why Supabase blocks deletes on its storage tables. Only the
-- empty bucket's row is deleted here, so the block is lifted for this
-- transaction alone; if any file is left, the foreign key from storage.objects
-- stops the migration and nothing changes.

drop table public.progress_photos;
drop type public.photo_pose;

drop policy "Users read own progress photo files" on storage.objects;
drop policy "Users upload own progress photo files" on storage.objects;
drop policy "Users delete own progress photo files" on storage.objects;

set local storage.allow_delete_query = 'true';
delete from storage.buckets where id = 'progress-photos';
