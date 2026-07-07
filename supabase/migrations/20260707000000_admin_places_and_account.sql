-- Admin pending/rejected place listing + place_likes public read
-- Run via supabase db push or SQL Editor on the hosted project.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- Admins can read/update all places (pending, rejected, approved).
drop policy if exists places_admin_select on public.places;
create policy places_admin_select
on public.places
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists places_admin_update on public.places;
create policy places_admin_update
on public.places
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- Security-definer fallback for admin queue (works even if RLS policies drift).
create or replace function public.admin_list_places(p_status text)
returns setof public.places
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.places p
  where p.status = p_status
    and exists (
      select 1
      from public.profiles pr
      where pr.auth_user_id = auth.uid()
        and pr.is_admin = true
    )
  order by p.created_at desc;
$$;

revoke all on function public.admin_list_places(text) from public;
grant execute on function public.admin_list_places(text) to authenticated;

-- Global like counts: anyone can read place_likes rows for counting.
drop policy if exists "Place likes are publicly readable" on public.place_likes;
drop policy if exists place_likes_select_own on public.place_likes;
drop policy if exists "place_likes_select_own" on public.place_likes;
create policy "Place likes are publicly readable"
on public.place_likes
for select
to anon, authenticated
using (true);
