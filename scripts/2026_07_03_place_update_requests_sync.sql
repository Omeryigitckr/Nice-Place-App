-- Sync existing place_update_requests to match app insert payload.
-- Run in Supabase SQL Editor, then retry place edit from the app.

alter table public.place_update_requests add column if not exists access_type text;
alter table public.place_update_requests add column if not exists best_time text;
alter table public.place_update_requests add column if not exists difficulty_level text;
alter table public.place_update_requests add column if not exists crowd_level text;
alter table public.place_update_requests add column if not exists is_pet_friendly boolean;
alter table public.place_update_requests add column if not exists is_child_friendly boolean;
alter table public.place_update_requests add column if not exists is_car_accessible boolean;
alter table public.place_update_requests add column if not exists is_camp_allowed boolean;
alter table public.place_update_requests add column if not exists is_picnic_suitable boolean;
alter table public.place_update_requests add column if not exists safety_note text;
alter table public.place_update_requests add column if not exists cover_photo_url text;

notify pgrst, 'reload schema';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'place_update_requests'
  and column_name in (
    'place_id',
    'user_id',
    'title',
    'description',
    'category',
    'latitude',
    'longitude',
    'access_type',
    'best_time',
    'difficulty_level',
    'crowd_level',
    'is_pet_friendly',
    'is_child_friendly',
    'is_car_accessible',
    'is_camp_allowed',
    'is_picnic_suitable',
    'safety_note',
    'cover_photo_url',
    'status'
  )
order by column_name;
