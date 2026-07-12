-- Nice Place — user collections for organizing saved places
-- Idempotent. Collections are private; user_id references profiles.id (same as saved_places).

-- ---------------------------------------------------------------------------
-- saved_collections
-- ---------------------------------------------------------------------------
create table if not exists public.saved_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text null,
  cover_photo_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_collections_user_id_idx
  on public.saved_collections (user_id);

create unique index if not exists saved_collections_user_name_unique_idx
  on public.saved_collections (user_id, lower(trim(name)));

-- ---------------------------------------------------------------------------
-- saved_collection_places
-- ---------------------------------------------------------------------------
create table if not exists public.saved_collection_places (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.saved_collections (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (collection_id, place_id)
);

create index if not exists saved_collection_places_collection_id_idx
  on public.saved_collection_places (collection_id);

create index if not exists saved_collection_places_place_id_idx
  on public.saved_collection_places (place_id);

create index if not exists saved_collection_places_collection_place_idx
  on public.saved_collection_places (collection_id, place_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
drop trigger if exists saved_collections_set_updated_at on public.saved_collections;
create trigger saved_collections_set_updated_at
before update on public.saved_collections
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.saved_collections enable row level security;
alter table public.saved_collection_places enable row level security;

drop policy if exists saved_collections_select_own on public.saved_collections;
create policy saved_collections_select_own
on public.saved_collections
for select
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists saved_collections_insert_own on public.saved_collections;
create policy saved_collections_insert_own
on public.saved_collections
for insert
to authenticated
with check (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists saved_collections_update_own on public.saved_collections;
create policy saved_collections_update_own
on public.saved_collections
for update
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
)
with check (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists saved_collections_delete_own on public.saved_collections;
create policy saved_collections_delete_own
on public.saved_collections
for delete
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists saved_collection_places_select_own on public.saved_collection_places;
create policy saved_collection_places_select_own
on public.saved_collection_places
for select
to authenticated
using (
  exists (
    select 1
    from public.saved_collections sc
    join public.profiles pr on pr.id = sc.user_id
    where sc.id = saved_collection_places.collection_id
      and pr.auth_user_id = auth.uid()
  )
);

drop policy if exists saved_collection_places_insert_own on public.saved_collection_places;
create policy saved_collection_places_insert_own
on public.saved_collection_places
for insert
to authenticated
with check (
  exists (
    select 1
    from public.saved_collections sc
    join public.profiles pr on pr.id = sc.user_id
    where sc.id = saved_collection_places.collection_id
      and pr.auth_user_id = auth.uid()
  )
);

drop policy if exists saved_collection_places_delete_own on public.saved_collection_places;
create policy saved_collection_places_delete_own
on public.saved_collection_places
for delete
to authenticated
using (
  exists (
    select 1
    from public.saved_collections sc
    join public.profiles pr on pr.id = sc.user_id
    where sc.id = saved_collection_places.collection_id
      and pr.auth_user_id = auth.uid()
  )
);
