-- Nice Place — Admin RLS for place_update_requests approve/reject
-- Run in Supabase SQL Editor once.
--
-- Required because:
-- - Users can INSERT/SELECT their own update requests
-- - Admins must UPDATE any request (status approved/rejected)
-- - Admins must UPDATE places when applying an approved request
-- - Pending place approve/reject can work while update requests fail if only
--   places policies were applied earlier
--
-- Permission source of truth: public.profiles.is_admin = true

-- Promote a user to admin (replace email):
-- update public.profiles
-- set is_admin = true
-- where auth_user_id = (
--   select id from auth.users where email = 'you@example.com'
-- );

-- ---------------------------------------------------------------------------
-- place_update_requests: admin SELECT (list + detail)
-- ---------------------------------------------------------------------------
drop policy if exists place_update_requests_admin_select on public.place_update_requests;
create policy place_update_requests_admin_select
on public.place_update_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  )
);

-- ---------------------------------------------------------------------------
-- place_update_requests: admin UPDATE (approve / reject)
-- Exact policy needed when UPDATE returns 0 rows and no PostgREST error.
-- ---------------------------------------------------------------------------
drop policy if exists place_update_requests_admin_update on public.place_update_requests;
create policy place_update_requests_admin_update
on public.place_update_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  )
);

-- ---------------------------------------------------------------------------
-- places: admin SELECT / UPDATE (apply approved request fields to live place)
-- ---------------------------------------------------------------------------
drop policy if exists places_admin_select on public.places;
create policy places_admin_select
on public.places
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  )
);

drop policy if exists places_admin_update on public.places;
create policy places_admin_update
on public.places
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  )
);
