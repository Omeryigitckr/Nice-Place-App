# Place update requests — manual approval

Use the Supabase Table Editor or SQL Editor to review edit submissions stored in `place_update_requests`.

The app **does not** update `places` directly on edit. Each submission creates a row with `status = 'pending'`.

## App insert fields (must match live table)

```txt
place_id
user_id
title
description
category
latitude
longitude
access_type
best_time
difficulty_level
crowd_level
is_pet_friendly
is_child_friendly
is_car_accessible
is_camp_allowed
is_picnic_suitable
safety_note
cover_photo_url
status
```

Notes:
- Column is `title`, not `name`.
- Places address column is `address_text` (not used on update requests).
- Tags are derived from category in the app; there is no `place_tags` table.

If inserts fail with PGRST204, run:

`scripts/2026_07_03_place_update_requests_sync.sql`

---

## A) View pending requests

```sql
select *
from public.place_update_requests
where status = 'pending'
order by created_at desc;
```

---

## B) Approve one request

Replace `<REQUEST_ID>` with the request uuid.

```sql
begin;

update public.places p
set
  title = coalesce(r.title, p.title),
  description = coalesce(r.description, p.description),
  category = coalesce(r.category, p.category),
  latitude = coalesce(r.latitude, p.latitude),
  longitude = coalesce(r.longitude, p.longitude),
  access_type = coalesce(r.access_type, p.access_type),
  best_time = coalesce(r.best_time, p.best_time),
  difficulty_level = coalesce(r.difficulty_level, p.difficulty_level),
  crowd_level = coalesce(r.crowd_level, p.crowd_level),
  is_pet_friendly = coalesce(r.is_pet_friendly, p.is_pet_friendly),
  is_child_friendly = coalesce(r.is_child_friendly, p.is_child_friendly),
  is_car_accessible = coalesce(r.is_car_accessible, p.is_car_accessible),
  is_camp_allowed = coalesce(r.is_camp_allowed, p.is_camp_allowed),
  is_picnic_suitable = coalesce(r.is_picnic_suitable, p.is_picnic_suitable),
  safety_note = coalesce(r.safety_note, p.safety_note),
  cover_photo_url = coalesce(r.cover_photo_url, p.cover_photo_url),
  updated_by = (
    select pr.id
    from public.profiles pr
    where pr.auth_user_id = r.user_id
    limit 1
  )
from public.place_update_requests r
where r.id = '<REQUEST_ID>'
  and r.status = 'pending'
  and p.id = r.place_id;

update public.place_update_requests
set
  status = 'approved',
  reviewed_at = now()
where id = '<REQUEST_ID>'
  and status = 'pending';

commit;
```

---

## C) Reject one request

```sql
update public.place_update_requests
set
  status = 'rejected',
  reviewed_at = now(),
  admin_note = 'Optional reason shown internally'
where id = '<REQUEST_ID>'
  and status = 'pending';
```

Rejection does **not** modify `places`.
