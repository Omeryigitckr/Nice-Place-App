-- Nice Place — Admin RLS for place update review panel
-- Required so admins can list/review/approve/reject requests in the app.
-- Run in Supabase SQL Editor once.

-- Admins can read all place update requests
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

-- Admins can update request status / notes
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

-- Admins can update any place when approving requests
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

-- Admins can read any place (including pending) for comparison
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

-- Promote a user to admin (replace email):
-- update public.profiles
-- set is_admin = true
-- where auth_user_id = (
--   select id from auth.users where email = 'you@example.com'
-- );
