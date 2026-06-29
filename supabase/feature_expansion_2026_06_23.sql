-- Mejoras incrementales: perfil/logo, dirigentes, sorteos, exportaciones y notificaciones.
-- Ejecutar despues de supabase/production_hardening.sql.
-- Idempotente: no elimina datos existentes.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists logo_url text;

grant update (full_name, phone, avatar_url, logo_url) on public.profiles to authenticated;

alter table public.teams
  add column if not exists manager_name text,
  add column if not exists manager_phone text,
  add column if not exists manager_email text,
  add column if not exists manager_notes text,
  add column if not exists manager_country_code text default '+593';

alter table public.players
  add column if not exists photo_url text;

alter table public.matches
  add column if not exists notes text;

create or replace view public.public_players as
  select id, tournament_id, team_id, full_name, photo_url
  from public.players;

create or replace function public.create_owned_tournament(
  p_name text,
  p_slug text,
  p_registration_fee numeric default 150
)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_tournament public.tournaments;
  v_active_count integer;
begin
  if v_user_id is null then
    raise exception 'No hay una sesion activa para crear el torneo';
  end if;

  select * into v_profile from public.profiles where profiles.id = v_user_id;
  if v_profile.id is null then
    raise exception 'No existe un perfil asociado al usuario actual';
  end if;

  if coalesce(v_profile.role, 'organizer') <> 'superadmin' then
    select count(*) into v_active_count
    from public.tournaments
    where user_id = v_user_id and status is distinct from 'deleted';

    if v_active_count >= coalesce(v_profile.max_tournaments, 1) then
      raise exception 'El cliente alcanzo el limite de torneos de su plan';
    end if;
  end if;

  insert into public.tournaments (
    name,
    slug,
    user_id,
    registration_fee,
    status,
    configuration_completed
  )
  values (
    btrim(p_name),
    btrim(p_slug),
    v_user_id,
    coalesce(p_registration_fee, 150),
    'active',
    false
  )
  returning * into v_tournament;

  insert into public.tournament_members (tournament_id, user_id, role)
  values (v_tournament.id, v_user_id, 'owner')
  on conflict (tournament_id, user_id) do update set role = excluded.role;

  return query select v_tournament.id::uuid, v_tournament.name::text;
end;
$$;

revoke all on function public.create_owned_tournament(text, text, numeric) from public, anon;
grant execute on function public.create_owned_tournament(text, text, numeric) to authenticated;

create or replace function public.register_financial_discount(
  p_tournament_id uuid,
  p_team_id uuid,
  p_category text,
  p_amount numeric,
  p_description text default null
)
returns public.financial_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.financial_ledger;
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_amount numeric := coalesce(p_amount, 0);
begin
  if not public.can_manage_tournament(p_tournament_id, 'finance') then
    raise exception 'No tienes permiso para registrar descuentos en este torneo';
  end if;

  if v_category not in ('inscripcion', 'arbitraje', 'amarilla', 'roja') then
    raise exception 'Selecciona un concepto valido para el descuento';
  end if;

  if v_amount <= 0 then
    raise exception 'El descuento debe ser mayor a cero';
  end if;

  if not exists (
    select 1 from public.teams
    where id = p_team_id and tournament_id = p_tournament_id
  ) then
    raise exception 'El equipo no pertenece al torneo seleccionado';
  end if;

  insert into public.financial_ledger (
    tournament_id,
    team_id,
    entry_type,
    category,
    amount,
    reference_type,
    reference_id,
    description
  )
  values (
    p_tournament_id,
    p_team_id,
    'adjustment',
    v_category,
    v_amount,
    'discount',
    gen_random_uuid()::text,
    coalesce(nullif(btrim(p_description), ''), 'Descuento aplicado a ' || v_category)
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function public.register_financial_discount(uuid, uuid, text, numeric, text) from public, anon;
grant execute on function public.register_financial_discount(uuid, uuid, text, numeric, text) to authenticated;

create index if not exists teams_tournament_manager_phone_idx
  on public.teams (tournament_id, manager_phone);

do $$
begin
  if not exists (
    select 1 from public.teams
    where manager_phone is not null and btrim(manager_phone) <> ''
    group by tournament_id, regexp_replace(manager_phone, '\D', '', 'g')
    having count(*) > 1
  ) then
    create unique index if not exists teams_tournament_manager_phone_unique_idx
      on public.teams (tournament_id, regexp_replace(manager_phone, '\D', '', 'g'))
      where manager_phone is not null and btrim(manager_phone) <> '';
  end if;
end $$;

create table if not exists public.draw_history (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  mode text not null check (mode in ('automatic', 'manual')),
  title text not null default 'Sorteo oficial',
  pots jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  random_seed text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists draw_history_tournament_created_idx
  on public.draw_history (tournament_id, created_at desc);
alter table public.draw_history enable row level security;
drop policy if exists draw_history_read on public.draw_history;
create policy draw_history_read on public.draw_history for select to authenticated
using (public.can_manage_tournament(tournament_id, 'read'));
drop policy if exists draw_history_write on public.draw_history;
create policy draw_history_write on public.draw_history for insert to authenticated
with check (public.can_manage_tournament(tournament_id, 'admin'));

create table if not exists public.financial_exports (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  export_type text not null check (export_type in ('pdf', 'xlsx', 'csv')),
  date_from date,
  date_to date,
  row_count integer not null default 0,
  generated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists financial_exports_tournament_created_idx
  on public.financial_exports (tournament_id, created_at desc);
alter table public.financial_exports enable row level security;
drop policy if exists financial_exports_read on public.financial_exports;
create policy financial_exports_read on public.financial_exports for select to authenticated
using (public.can_manage_tournament(tournament_id, 'finance'));
drop policy if exists financial_exports_insert on public.financial_exports;
create policy financial_exports_insert on public.financial_exports for insert to authenticated
with check (public.can_manage_tournament(tournament_id, 'finance'));

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  recipient_name text not null,
  country_code text not null default '+593',
  phone text not null,
  channel text not null default 'whatsapp',
  message_type text not null,
  template_name text,
  message text not null,
  status text not null default 'prepared',
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Compatibilidad con el modelo usado por la app.
-- Versiones anteriores de esta migracion crearon phone/message, mientras que
-- el frontend usa recipient_phone/message_body. Mantenemos ambos pares para
-- evitar fallos por schema cache de PostgREST y no romper datos existentes.
alter table public.notification_logs
  add column if not exists recipient_phone text,
  add column if not exists message_body text;

update public.notification_logs
set recipient_phone = phone
where recipient_phone is null and phone is not null;

update public.notification_logs
set message_body = message
where message_body is null and message is not null;

create index if not exists notification_logs_tournament_created_idx
  on public.notification_logs (tournament_id, created_at desc);
alter table public.notification_logs enable row level security;
drop policy if exists notification_logs_read on public.notification_logs;
create policy notification_logs_read on public.notification_logs for select to authenticated
using (public.can_manage_tournament(tournament_id, 'read'));
drop policy if exists notification_logs_write on public.notification_logs;
create policy notification_logs_write on public.notification_logs for insert to authenticated
with check (public.can_manage_tournament(tournament_id, 'admin') or public.can_manage_tournament(tournament_id, 'matches'));

insert into storage.buckets (id, name, public)
values ('profile-assets', 'profile-assets', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('player-assets', 'player-assets', true)
on conflict (id) do update set public = true;

drop policy if exists profile_assets_public_read on storage.objects;
create policy profile_assets_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'profile-assets');

drop policy if exists profile_assets_owner_insert on storage.objects;
create policy profile_assets_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_assets_owner_update on storage.objects;
create policy profile_assets_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists profile_assets_owner_delete on storage.objects;
create policy profile_assets_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

select pg_notify('pgrst', 'reload schema');
