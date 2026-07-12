-- Multi-photo support for places (1–3 photos per place).
-- Safe to run multiple times. Does not destroy existing data.

alter table public.place_photos
  add column if not exists order_index integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by place_id
      order by created_at asc, id asc
    ) - 1 as idx
  from public.place_photos
)
update public.place_photos pp
set order_index = ranked.idx
from ranked
where pp.id = ranked.id
  and pp.order_index = 0
  and ranked.idx > 0;

with cover_candidates as (
  select distinct on (place_id)
    id,
    place_id
  from public.place_photos
  order by place_id, is_cover desc, order_index asc, created_at asc
)
update public.place_photos pp
set is_cover = (pp.id = cc.id)
from cover_candidates cc
where pp.place_id = cc.place_id;

create index if not exists place_photos_place_order_idx
  on public.place_photos (place_id, order_index);

alter table public.place_update_requests
  add column if not exists photo_urls jsonb;

comment on column public.place_update_requests.photo_urls is
  'Ordered JSON array of public image URLs submitted with an edit request (max 3).';

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
