-- Game Legal Tournament
-- Hotfix seguro para que un cliente autenticado pueda crear su torneo.
-- Ejecutar en Supabase > SQL Editor.
-- No elimina datos. Es idempotente.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists role text default 'organizer',
  add column if not exists saas_status text default 'active',
  add column if not exists max_tournaments integer default 1,
  add column if not exists archived_at timestamptz,
  add column if not exists avatar_url text,
  add column if not exists logo_url text;

alter table public.tournaments
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists slug text,
  add column if not exists registration_fee numeric default 150,
  add column if not exists status text default 'active',
  add column if not exists configuration_completed boolean default false,
  add column if not exists tournament_sponsors text[] default '{}',
  add column if not exists group_count integer default 1,
  add column if not exists teams_per_group integer default 4,
  add column if not exists qualifiers_per_group integer default 2,
  add column if not exists repechage_enabled boolean default false,
  add column if not exists repechage_slots integer default 0,
  add column if not exists knockout_legs integer default 1,
  add column if not exists final_legs integer default 1,
  add column if not exists court_count integer default 1,
  add column if not exists start_date date,
  add column if not exists estimated_end_date date,
  add column if not exists match_duration_minutes integer default 60,
  add column if not exists break_between_matches_minutes integer default 10,
  add column if not exists banner_url text,
  add column if not exists poster_url text,
  add column if not exists match_poster_background_url text,
  add column if not exists football_modality integer default 11,
  add column if not exists substitutes_count integer default 5,
  add column if not exists final_venue text,
  add column if not exists tournament_year integer default extract(year from current_date)::integer,
  add column if not exists is_auto_template_enabled boolean default false,
  add column if not exists max_players_per_team integer default 25,
  add column if not exists yellow_cards_for_suspension integer default 3,
  add column if not exists yellow_suspension_matches integer default 1,
  add column if not exists red_suspension_matches integer default 1;

create table if not exists public.tournament_members (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'finance', 'referee', 'viewer')),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

alter table public.tournament_members enable row level security;

create or replace function public.can_manage_tournament(
  p_tournament_id uuid,
  p_capability text default 'read'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = p_tournament_id
      and (
        t.user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
        or exists (
          select 1
          from public.tournament_members tm
          where tm.tournament_id = t.id
            and tm.user_id = auth.uid()
            and (
              tm.role in ('owner', 'admin')
              or p_capability = 'read'
              or (p_capability = 'finance' and tm.role = 'finance')
              or (p_capability = 'matches' and tm.role = 'referee')
            )
        )
      )
  );
$$;

revoke all on function public.can_manage_tournament(uuid, text) from public, anon;
grant execute on function public.can_manage_tournament(uuid, text) to authenticated;

drop policy if exists tournament_members_read on public.tournament_members;
create policy tournament_members_read
  on public.tournament_members
  for select
  to authenticated
  using (user_id = auth.uid() or public.can_manage_tournament(tournament_id, 'admin'));

drop policy if exists tournament_members_admin_write on public.tournament_members;
create policy tournament_members_admin_write
  on public.tournament_members
  for all
  to authenticated
  using (public.can_manage_tournament(tournament_id, 'admin'))
  with check (public.can_manage_tournament(tournament_id, 'admin'));

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
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_tournament public.tournaments;
  v_active_count integer;
  v_clean_name text := btrim(coalesce(p_name, ''));
  v_clean_slug text := btrim(coalesce(p_slug, ''));
begin
  if v_user_id is null then
    raise exception 'No hay una sesion activa para crear el torneo';
  end if;

  if length(v_clean_name) = 0 then
    raise exception 'El nombre del torneo es obligatorio';
  end if;

  if length(v_clean_slug) = 0 then
    v_clean_slug := lower(regexp_replace(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
  end if;

  insert into public.profiles (id, email, full_name, role, saas_status, max_tournaments)
  values (
    v_user_id,
    (select auth_users.email from auth.users as auth_users where auth_users.id = v_user_id),
    coalesce(
      (select auth_users.raw_user_meta_data ->> 'full_name' from auth.users as auth_users where auth_users.id = v_user_id),
      (select auth_users.email from auth.users as auth_users where auth_users.id = v_user_id)
    ),
    'organizer',
    'active',
    1
  )
  on conflict on constraint profiles_pkey do update set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name)
  returning * into v_profile;

  if coalesce(v_profile.saas_status, 'active') <> 'active' then
    raise exception 'La cuenta del cliente no esta activa';
  end if;

  if coalesce(v_profile.role, 'organizer') <> 'superadmin' then
    select count(*) into v_active_count
    from public.tournaments as existing_tournaments
    where existing_tournaments.user_id = v_user_id
      and existing_tournaments.status is distinct from 'deleted';

    if v_active_count >= coalesce(v_profile.max_tournaments, 1) then
      raise exception 'El cliente alcanzo el limite de torneos de su plan';
    end if;
  end if;

  insert into public.tournaments (name, slug, user_id, registration_fee, status, configuration_completed)
  values (v_clean_name, v_clean_slug, v_user_id, coalesce(p_registration_fee, 150), 'active', false)
  returning * into v_tournament;

  insert into public.tournament_members (tournament_id, user_id, role)
  values (v_tournament.id, v_user_id, 'owner')
  on conflict (tournament_id, user_id)
  do update set role = excluded.role;

  return query select v_tournament.id, v_tournament.name;
end;
$$;

revoke all on function public.create_owned_tournament(text, text, numeric) from public, anon;
grant execute on function public.create_owned_tournament(text, text, numeric) to authenticated;

alter table public.tournaments enable row level security;

drop policy if exists tournaments_public_read on public.tournaments;
create policy tournaments_public_read
  on public.tournaments
  for select
  to anon
  using (status is distinct from 'deleted');

drop policy if exists tournaments_tenant_read on public.tournaments;
create policy tournaments_tenant_read
  on public.tournaments
  for select
  to authenticated
  using (public.can_manage_tournament(id, 'read'));

drop policy if exists tournaments_manager_write on public.tournaments;
create policy tournaments_manager_write
  on public.tournaments
  for all
  to authenticated
  using (public.can_manage_tournament(id, 'admin'))
  with check (user_id = auth.uid() or public.can_manage_tournament(id, 'admin'));

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant update (full_name, phone, avatar_url, logo_url) on public.profiles to authenticated;

select pg_notify('pgrst', 'reload schema');
