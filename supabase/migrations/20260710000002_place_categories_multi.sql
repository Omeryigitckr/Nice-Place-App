-- Multi-category support (1–4 categories per place)

create table if not exists public.place_categories (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  category_key text not null,
  created_at timestamptz not null default now(),
  unique (place_id, category_key)
);

create index if not exists place_categories_place_id_idx on public.place_categories (place_id);
create index if not exists place_categories_category_key_idx on public.place_categories (category_key);
create index if not exists place_categories_place_category_idx on public.place_categories (place_id, category_key);

insert into public.place_categories (place_id, category_key)
select p.id, p.category
from public.places p
where p.category is not null and trim(p.category) <> ''
on conflict (place_id, category_key) do nothing;

alter table public.place_update_requests add column if not exists category_keys jsonb;

alter table public.place_categories enable row level security;

drop policy if exists place_categories_select_approved on public.place_categories;
create policy place_categories_select_approved on public.place_categories for select to anon, authenticated
using (exists (select 1 from public.places p where p.id = place_categories.place_id and p.status = 'approved'));

drop policy if exists place_categories_select_own on public.place_categories;
create policy place_categories_select_own on public.place_categories for select to authenticated
using (exists (select 1 from public.places p join public.profiles pr on pr.id = p.created_by where p.id = place_categories.place_id and pr.auth_user_id = auth.uid()));

drop policy if exists place_categories_insert_own on public.place_categories;
create policy place_categories_insert_own on public.place_categories for insert to authenticated
with check (exists (select 1 from public.places p join public.profiles pr on pr.id = p.created_by where p.id = place_categories.place_id and pr.auth_user_id = auth.uid()));

drop policy if exists place_categories_delete_own on public.place_categories;
create policy place_categories_delete_own on public.place_categories for delete to authenticated
using (exists (select 1 from public.places p join public.profiles pr on pr.id = p.created_by where p.id = place_categories.place_id and pr.auth_user_id = auth.uid()));

drop policy if exists place_categories_admin_select on public.place_categories;
create policy place_categories_admin_select on public.place_categories for select to authenticated using (public.is_current_user_admin());

drop policy if exists place_categories_admin_insert on public.place_categories;
create policy place_categories_admin_insert on public.place_categories for insert to authenticated with check (public.is_current_user_admin());

drop policy if exists place_categories_admin_update on public.place_categories;
create policy place_categories_admin_update on public.place_categories for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

drop policy if exists place_categories_admin_delete on public.place_categories;
create policy place_categories_admin_delete on public.place_categories for delete to authenticated using (public.is_current_user_admin());

create or replace function public.sync_place_categories(p_place_id uuid, p_category_keys text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_current_user_admin()
     and not exists (select 1 from public.places p join public.profiles pr on pr.id = p.created_by where p.id = p_place_id and pr.auth_user_id = auth.uid()) then
    raise exception 'not authorized to sync place categories';
  end if;
  delete from public.place_categories where place_id = p_place_id;
  if p_category_keys is not null then
    insert into public.place_categories (place_id, category_key)
    select p_place_id, key from unnest(p_category_keys) as key where key is not null and trim(key) <> ''
    on conflict (place_id, category_key) do nothing;
  end if;
  update public.places set category = coalesce(p_category_keys[1], category) where id = p_place_id;
end;
$$;

revoke all on function public.sync_place_categories(uuid, text[]) from public;
grant execute on function public.sync_place_categories(uuid, text[]) to authenticated;
