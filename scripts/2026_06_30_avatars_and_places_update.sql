-- Nice Place — Avatar storage + places update RLS
-- Run in Supabase SQL Editor after prior migration scripts.

-- ---------------------------------------------------------------------------
-- Storage bucket: avatars
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path format: {auth_user_id}/{timestamp}.jpg
drop policy if exists avatars_storage_select on storage.objects;
create policy avatars_storage_select
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists avatars_storage_insert_own on storage.objects;
create policy avatars_storage_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_storage_update_own on storage.objects;
create policy avatars_storage_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists avatars_storage_delete_own on storage.objects;
create policy avatars_storage_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- places: allow owners to update their own rows
-- ---------------------------------------------------------------------------
drop policy if exists places_update_own on public.places;
create policy places_update_own
on public.places for update
to authenticated
using (
  created_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
)
with check (
  created_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
