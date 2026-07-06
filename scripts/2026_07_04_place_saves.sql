-- Nice Place — saved_places (place saves), RLS, and save_count sync
-- Table name in this project: public.saved_places (same role as place_saves)
-- Run in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create index if not exists saved_places_place_id_idx on public.saved_places (place_id);
create index if not exists saved_places_user_id_idx on public.saved_places (user_id);

alter table public.saved_places enable row level security;

-- ---------------------------------------------------------------------------
-- RLS
-- Everyone can read saves so place cards can show public save counts.
-- UI never displays who saved a place.
-- Signed-in users insert/delete only their own rows.
-- ---------------------------------------------------------------------------
drop policy if exists "saved_places_select_own" on public.saved_places;
drop policy if exists saved_places_select_own on public.saved_places;
drop policy if exists "Place saves are publicly readable" on public.saved_places;
create policy "Place saves are publicly readable"
on public.saved_places
for select
to anon, authenticated
using (true);

drop policy if exists "saved_places_insert_own" on public.saved_places;
drop policy if exists saved_places_insert_own on public.saved_places;
drop policy if exists "Users can save places" on public.saved_places;
create policy "Users can save places"
on public.saved_places
for insert
to authenticated
with check (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists "saved_places_delete_own" on public.saved_places;
drop policy if exists saved_places_delete_own on public.saved_places;
drop policy if exists "Users can unsave their own saves" on public.saved_places;
create policy "Users can unsave their own saves"
on public.saved_places
for delete
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- Keep places.save_count in sync (never negative)
-- ---------------------------------------------------------------------------
create or replace function public.sync_place_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.places
    set save_count = greatest(0, coalesce(save_count, 0) + 1)
    where id = new.place_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.places
    set save_count = greatest(0, coalesce(save_count, 0) - 1)
    where id = old.place_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists saved_places_increment_save_count on public.saved_places;
drop trigger if exists saved_places_decrement_save_count on public.saved_places;
drop trigger if exists saved_places_sync_count on public.saved_places;
create trigger saved_places_sync_count
after insert or delete on public.saved_places
for each row execute function public.sync_place_save_count();

-- Backfill counts from saved_places (source of truth).
update public.places p
set save_count = (
  select count(*)::integer
  from public.saved_places sp
  where sp.place_id = p.id
);

-- Ensure place_likes remain publicly readable for profile/card counts.
drop policy if exists "place_likes_select_own" on public.place_likes;
drop policy if exists "Place likes are publicly readable" on public.place_likes;
create policy "Place likes are publicly readable"
on public.place_likes
for select
to anon, authenticated
using (true);
