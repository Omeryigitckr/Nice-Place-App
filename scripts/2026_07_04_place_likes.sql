-- Nice Place — place_likes table, RLS, and like_count sync
-- Run in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.place_likes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create index if not exists place_likes_place_id_idx on public.place_likes (place_id);
create index if not exists place_likes_user_id_idx on public.place_likes (user_id);

alter table public.place_likes enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: everyone can read; signed-in users manage only their own likes
-- ---------------------------------------------------------------------------
drop policy if exists "place_likes_select_own" on public.place_likes;
drop policy if exists "place_likes_select_all" on public.place_likes;
drop policy if exists "Place likes are publicly readable" on public.place_likes;
create policy "Place likes are publicly readable"
on public.place_likes
for select
to anon, authenticated
using (true);

drop policy if exists "place_likes_insert_own" on public.place_likes;
drop policy if exists "Users can like places" on public.place_likes;
create policy "Users can like places"
on public.place_likes
for insert
to authenticated
with check (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists "place_likes_delete_own" on public.place_likes;
drop policy if exists "Users can unlike their own likes" on public.place_likes;
create policy "Users can unlike their own likes"
on public.place_likes
for delete
to authenticated
using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- Keep places.like_count in sync (never negative)
-- ---------------------------------------------------------------------------
create or replace function public.sync_place_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.places
    set like_count = greatest(0, coalesce(like_count, 0) + 1)
    where id = new.place_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.places
    set like_count = greatest(0, coalesce(like_count, 0) - 1)
    where id = old.place_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists place_likes_sync_count on public.place_likes;
create trigger place_likes_sync_count
after insert or delete on public.place_likes
for each row execute function public.sync_place_like_count();

-- Backfill counts from place_likes (source of truth).
update public.places p
set like_count = (
  select count(*)::integer
  from public.place_likes pl
  where pl.place_id = p.id
);
