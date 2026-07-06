-- Nice Place — Storage bucket + policies for place photo uploads
-- Bucket id/name must match src/constants/storage.ts → PLACE_PHOTOS_BUCKET = 'place-photos'
-- Run in Supabase SQL Editor. Create the bucket here if Dashboard insert is blocked.

-- ---------------------------------------------------------------------------
-- Storage bucket (public read for map display)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-photos',
  'place-photos',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies
-- Path format: {auth_user_id}/{place_id}/{timestamp}.jpg
-- ---------------------------------------------------------------------------
drop policy if exists place_photos_storage_select on storage.objects;
create policy place_photos_storage_select
on storage.objects for select
to public
using (bucket_id = 'place-photos');

drop policy if exists place_photos_storage_insert_own on storage.objects;
create policy place_photos_storage_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'place-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists place_photos_storage_update_own on storage.objects;
create policy place_photos_storage_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'place-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'place-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists place_photos_storage_delete_own on storage.objects;
create policy place_photos_storage_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'place-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- place_photos RLS (creators can attach photos to their own places)
-- ---------------------------------------------------------------------------
drop policy if exists place_photos_insert_authenticated on public.place_photos;
drop policy if exists place_photos_insert_own_places on public.place_photos;
create policy place_photos_insert_own_places
on public.place_photos for insert
to authenticated
with check (
  uploaded_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
  and place_id in (
    select id from public.places
    where created_by in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

drop policy if exists place_photos_select_own on public.place_photos;
create policy place_photos_select_own
on public.place_photos for select
to authenticated
using (
  uploaded_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- Verify bucket exists
select id, name, public
from storage.buckets
where id = 'place-photos';
