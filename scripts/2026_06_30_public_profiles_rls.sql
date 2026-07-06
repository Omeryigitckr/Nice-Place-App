-- Nice Place — Public profile read access for creators with approved places
-- Run in Supabase SQL Editor after prior migration scripts.
--
-- Allows anon/authenticated users to read profile rows for creators who have
-- at least one approved place. The app only selects safe columns:
-- id, username, full_name, avatar_url, bio, created_at

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
on public.profiles for select
to anon, authenticated
using (
  exists (
    select 1
    from public.places p
    where p.created_by = profiles.id
      and p.status = 'approved'
  )
);
