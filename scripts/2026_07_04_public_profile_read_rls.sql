-- Nice Place — Public profile visibility
-- Allows any user (including guests) to read safe profile fields and approved places.
-- The app only selects: id, auth_user_id, username, avatar_url, bio
-- Display name is username (fallback: "Nice Place user"). No display_name column.
-- Run in Supabase SQL Editor.

-- Public profiles are readable by everyone (UI never displays email / auth_user_id / is_admin).
drop policy if exists profiles_select_public on public.profiles;
drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable"
on public.profiles
for select
to anon, authenticated
using (true);

-- Approved places are publicly readable.
drop policy if exists places_select_approved on public.places;
drop policy if exists "Approved places are publicly readable" on public.places;
create policy "Approved places are publicly readable"
on public.places
for select
to anon, authenticated
using (status = 'approved');

-- Keep owner read access for non-approved own places (profile "shared" list).
drop policy if exists places_select_own on public.places;
create policy places_select_own
on public.places
for select
to authenticated
using (
  created_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
