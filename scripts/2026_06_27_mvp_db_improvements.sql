-- Nice Place — MVP database improvements (incremental)
-- Safe to run on an existing database. Does not recreate tables.

-- ---------------------------------------------------------------------------
-- places: new columns
-- ---------------------------------------------------------------------------
alter table public.places
  add column if not exists cover_photo_url text;

alter table public.places
  add column if not exists slug text;

alter table public.places
  add column if not exists updated_by uuid references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- profiles: new columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_storage_path text;

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
create unique index if not exists places_slug_unique_idx
  on public.places (slug);

create index if not exists places_location_point_gix
  on public.places using gist (location_point);

create index if not exists places_status_idx
  on public.places (status);

create index if not exists places_like_count_idx
  on public.places (like_count desc);

-- ---------------------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------------------
-- Added to places: cover_photo_url, slug, updated_by (FK → profiles)
-- Added to profiles: avatar_storage_path
-- Added indexes: unique slug, spatial location_point (GIST), status, like_count DESC
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
