-- Nice Place — Profile avatars storage bucket
-- Bucket id/name must match src/constants/storage.ts → PROFILE_AVATARS_BUCKET = 'profile-avatars'
-- Run in Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path format: {auth_user_id}/avatar_{timestamp}.jpg
drop policy if exists profile_avatars_storage_select on storage.objects;
create policy profile_avatars_storage_select
on storage.objects for select
to public
using (bucket_id = 'profile-avatars');

drop policy if exists profile_avatars_storage_insert_own on storage.objects;
create policy profile_avatars_storage_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_avatars_storage_update_own on storage.objects;
create policy profile_avatars_storage_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_avatars_storage_delete_own on storage.objects;
create policy profile_avatars_storage_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure profiles can update their own avatar fields
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

select id, name, public
from storage.buckets
where id = 'profile-avatars';
