-- Nice Place — track identical rejected-place resubmits
-- Run in Supabase SQL Editor once.
--
-- Owners may resubmit an unchanged rejected place at most 2 times.
-- When they change any field, the app resets this counter to 0.

alter table public.places
  add column if not exists rejected_resubmit_count integer not null default 0;

comment on column public.places.rejected_resubmit_count is
  'Number of identical (no-change) resubmits after rejection. Max 2.';
