-- Nice Place — MVP: saved places + creator visibility
-- Run after supabase_schema.sql and 2026_06_27_mvp_db_improvements.sql

-- ---------------------------------------------------------------------------
-- Allow authenticated users to read places they created (any status).
-- Needed for profile "shared places" counts and future submission views.
-- ---------------------------------------------------------------------------
drop policy if exists places_select_own on public.places;
create policy places_select_own
on public.places for select
to authenticated
using (
  created_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Tighten place inserts: created_by must be the caller's profile.
-- ---------------------------------------------------------------------------
drop policy if exists places_insert_authenticated on public.places;
create policy places_insert_authenticated
on public.places for insert
to authenticated
with check (
  created_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Optional: auto-increment save_count when a place is saved (MVP helper).
-- ---------------------------------------------------------------------------
create or replace function public.increment_place_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.places
  set save_count = save_count + 1
  where id = new.place_id;
  return new;
end;
$$;

create or replace function public.decrement_place_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.places
  set save_count = greatest(save_count - 1, 0)
  where id = old.place_id;
  return old;
end;
$$;

drop trigger if exists saved_places_increment_save_count on public.saved_places;
create trigger saved_places_increment_save_count
after insert on public.saved_places
for each row execute function public.increment_place_save_count();

drop trigger if exists saved_places_decrement_save_count on public.saved_places;
create trigger saved_places_decrement_save_count
after delete on public.saved_places
for each row execute function public.decrement_place_save_count();

-- Saved places RLS policies
alter table public.saved_places enable row level security;

drop policy if exists saved_places_select_own on public.saved_places;
create policy saved_places_select_own
on public.saved_places for select
to authenticated
using (
  user_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists saved_places_insert_own on public.saved_places;
create policy saved_places_insert_own
on public.saved_places for insert
to authenticated
with check (
  user_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists saved_places_delete_own on public.saved_places;
create policy saved_places_delete_own
on public.saved_places for delete
to authenticated
using (
  user_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);