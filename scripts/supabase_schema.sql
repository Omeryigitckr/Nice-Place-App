-- Nice Place — Supabase MVP Schema
-- Run this in the Supabase SQL Editor before seed_places.sql

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  trust_score integer not null default 0,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- places
-- ---------------------------------------------------------------------------
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'other',
  latitude double precision not null,
  longitude double precision not null,
  location_point geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  address_text text,
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  verification_count integer not null default 0,
  like_count integer not null default 0,
  save_count integer not null default 0,
  view_count integer not null default 0,
  best_time text,
  access_type text not null default 'unknown' check (
    access_type in ('car', 'walking', 'bicycle', 'public_transport', 'mixed', 'unknown')
  ),
  difficulty_level text not null default 'unknown' check (
    difficulty_level in ('easy', 'medium', 'hard', 'unknown')
  ),
  crowd_level text not null default 'unknown' check (
    crowd_level in ('quiet', 'normal', 'crowded', 'unknown')
  ),
  is_pet_friendly boolean not null default false,
  is_child_friendly boolean not null default false,
  is_car_accessible boolean not null default false,
  is_camp_allowed boolean not null default false,
  is_picnic_suitable boolean not null default false,
  safety_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_status_idx on public.places (status);
create index if not exists places_category_idx on public.places (category);
create index if not exists places_location_idx on public.places using gist (location_point);

-- ---------------------------------------------------------------------------
-- place_photos
-- ---------------------------------------------------------------------------
create table if not exists public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  image_url text not null,
  storage_path text,
  caption text,
  is_cover boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz not null default now()
);

create index if not exists place_photos_place_id_idx on public.place_photos (place_id);

-- ---------------------------------------------------------------------------
-- saved_places
-- ---------------------------------------------------------------------------
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

-- ---------------------------------------------------------------------------
-- place_likes
-- ---------------------------------------------------------------------------
create table if not exists public.place_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('place', 'photo', 'route', 'profile')),
  target_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
before update on public.places
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.place_photos enable row level security;
alter table public.saved_places enable row level security;
alter table public.place_likes enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = auth_user_id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = auth_user_id);

-- places: everyone reads approved
create policy "places_select_approved"
on public.places for select
to anon, authenticated
using (status = 'approved');

create policy "places_insert_authenticated"
on public.places for insert
to authenticated
with check (true);

-- place_photos: read approved cover photos for approved places
create policy "place_photos_select_approved"
on public.place_photos for select
to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.places p
    where p.id = place_photos.place_id and p.status = 'approved'
  )
);

create policy "place_photos_insert_authenticated"
on public.place_photos for insert
to authenticated
with check (true);

-- saved_places
create policy "saved_places_select_own"
on public.saved_places for select
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "saved_places_insert_own"
on public.saved_places for insert
to authenticated
with check (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "saved_places_delete_own"
on public.saved_places for delete
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

-- place_likes
create policy "place_likes_select_own"
on public.place_likes for select
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "place_likes_insert_own"
on public.place_likes for insert
to authenticated
with check (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "place_likes_delete_own"
on public.place_likes for delete
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

-- reports
create policy "reports_insert_authenticated"
on public.reports for insert
to authenticated
with check (
  reporter_id in (select id from public.profiles where auth_user_id = auth.uid())
);

create policy "reports_select_own"
on public.reports for select
to authenticated
using (
  reporter_id in (select id from public.profiles where auth_user_id = auth.uid())
);
