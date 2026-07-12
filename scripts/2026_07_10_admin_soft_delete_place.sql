-- Nice Place — reliable admin soft-delete (status = 'deleted')
-- Run once in Supabase SQL Editor.
--
-- Fixes "Couldn't complete action" when admin removes a place from public view:
-- 1) Ensures places.status allows 'deleted'
-- 2) Ensures admin UPDATE RLS exists
-- 3) Adds security-definer RPC (bypasses RLS drift, same pattern as admin_list_places)

-- ---------------------------------------------------------------------------
-- places.status must allow 'deleted'
-- ---------------------------------------------------------------------------
alter table public.places
  drop constraint if exists places_status_check;

alter table public.places
  add constraint places_status_check
  check (status in ('pending', 'approved', 'rejected', 'hidden', 'deleted'));

-- ---------------------------------------------------------------------------
-- Admin helper (idempotent)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and is_admin = true
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists places_admin_select on public.places;
create policy places_admin_select
on public.places
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists places_admin_update on public.places;
create policy places_admin_update
on public.places
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- RPC: admin status updates (soft-delete, restore, approve/reject fallback)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_place_status(
  p_place_id uuid,
  p_status text
)
returns public.places
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.places;
begin
  if not public.is_current_user_admin() then
    raise exception 'admin access required';
  end if;

  if p_status not in ('pending', 'approved', 'rejected', 'hidden', 'deleted') then
    raise exception 'invalid place status: %', p_status;
  end if;

  update public.places
  set status = p_status
  where id = p_place_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'place not found';
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_update_place_status(uuid, text) from public;
grant execute on function public.admin_update_place_status(uuid, text) to authenticated;
