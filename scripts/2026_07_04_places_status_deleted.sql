-- Nice Place — allow places.status = 'deleted' for admin soft-delete
-- Run in Supabase SQL Editor once.
--
-- Public queries already filter status = 'approved', so deleted places stay hidden.
-- Admin restore/delete uses the existing places_admin_update policy (profiles.is_admin = true).

alter table public.places
  drop constraint if exists places_status_check;

alter table public.places
  add constraint places_status_check
  check (status in ('pending', 'approved', 'rejected', 'hidden', 'deleted'));
