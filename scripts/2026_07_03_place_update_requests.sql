-- Nice Place — place_update_requests
-- Matches app insert payload (src/constants/placeUpdateRequestSchema.ts)
--
-- Insert fields:
-- place_id, user_id, title, description, category, latitude, longitude,
-- access_type, best_time, difficulty_level, crowd_level,
-- is_pet_friendly, is_child_friendly, is_car_accessible, is_camp_allowed,
-- is_picnic_suitable, safety_note, cover_photo_url, status
--
-- Run in Supabase Dashboard → SQL Editor.

create table if not exists public.place_update_requests (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  description text,
  category text,
  latitude double precision,
  longitude double precision,
  access_type text,
  best_time text,
  difficulty_level text,
  crowd_level text,
  is_pet_friendly boolean,
  is_child_friendly boolean,
  is_car_accessible boolean,
  is_camp_allowed boolean,
  is_picnic_suitable boolean,
  safety_note text,
  cover_photo_url text,
  status text not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  constraint place_update_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

-- If the table already exists with fewer columns, add the missing ones.
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

create index if not exists place_update_requests_place_id_idx
  on public.place_update_requests (place_id);

create index if not exists place_update_requests_user_id_idx
  on public.place_update_requests (user_id);

create index if not exists place_update_requests_status_idx
  on public.place_update_requests (status);

alter table public.place_update_requests enable row level security;

drop policy if exists "Users can insert own place update requests" on public.place_update_requests;
create policy "Users can insert own place update requests"
on public.place_update_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own place update requests" on public.place_update_requests;
create policy "Users can read own place update requests"
on public.place_update_requests
for select
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'place_update_requests'
order by ordinal_position;
