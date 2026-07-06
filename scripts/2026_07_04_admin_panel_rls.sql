-- Nice Place — Admin panel RLS (pending places + update requests + photos)
-- Run once in Supabase SQL Editor.
--
-- SOURCE OF TRUTH (app + RLS):
--   public.profiles.is_admin = true
--
-- profiles.role = 'admin' is optional metadata only. Write policies require is_admin.
-- If you previously used role alone, this script sets is_admin = true for those rows.
--
-- Promote a specific user (replace email):
--   update public.profiles
--   set is_admin = true
--   where auth_user_id = (
--     select id from auth.users where email = 'you@example.com'
--   );

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.profiles
  add column if not exists role text;

-- Keep is_admin in sync for role-based admins (RLS + app both work).
update public.profiles
set is_admin = true
where lower(coalesce(role, '')) = 'admin'
  and is_admin is distinct from true;

-- Shared admin predicate for policies — is_admin only (matches the app).
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

-- ---------------------------------------------------------------------------
-- places: admins can read all (including pending/rejected) and update status
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- place_photos: admins can approve pending photos when approving a place
-- ---------------------------------------------------------------------------
drop policy if exists place_photos_admin_select on public.place_photos;
create policy place_photos_admin_select
on public.place_photos
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists place_photos_admin_update on public.place_photos;
create policy place_photos_admin_update
on public.place_photos
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- place_update_requests: admins can list and review
-- ---------------------------------------------------------------------------
drop policy if exists place_update_requests_admin_select on public.place_update_requests;
create policy place_update_requests_admin_select
on public.place_update_requests
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists place_update_requests_admin_update on public.place_update_requests;
create policy place_update_requests_admin_update
on public.place_update_requests
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());
