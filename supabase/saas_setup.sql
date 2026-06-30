-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Es idempotente: no elimina datos existentes.

create extension if not exists pgcrypto;

alter table public.tournaments
  add column if not exists group_count integer default 1,
  add column if not exists teams_per_group integer default 4,
  add column if not exists qualifiers_per_group integer default 2,
  add column if not exists repechage_enabled boolean default false,
  add column if not exists repechage_slots integer default 0,
  add column if not exists knockout_legs integer default 1,
  add column if not exists final_legs integer default 1,
  add column if not exists knockout_pairing_mode text default 'general_table',
  add column if not exists substitution_rule text default 'limited',
  add column if not exists court_count integer default 1,
  add column if not exists start_date date,
  add column if not exists estimated_end_date date,
  add column if not exists match_duration_minutes integer default 60,
  add column if not exists break_between_matches_minutes integer default 10,
  add column if not exists banner_url text,
  add column if not exists poster_url text,
  add column if not exists match_poster_background_url text,
  add column if not exists tournament_sponsors text[] default '{}',
  add column if not exists football_modality integer default 11,
  add column if not exists substitutes_count integer default 5,
  add column if not exists final_venue text,
  add column if not exists tournament_year integer default extract(year from current_date)::integer,
  add column if not exists is_auto_template_enabled boolean default false,
  add column if not exists max_players_per_team integer default 25,
  add column if not exists yellow_cards_for_suspension integer default 3,
  add column if not exists yellow_suspension_matches integer default 1,
  add column if not exists red_suspension_matches integer default 1,
  add column if not exists configuration_completed boolean default false;

create index if not exists players_tournament_team_idx
  on public.players (tournament_id, team_id);

alter table public.players
  add column if not exists photo_url text;

create index if not exists players_tournament_cedula_lookup_idx
  on public.players (tournament_id, lower(btrim(cedula)));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_full_name_required') then
    alter table public.players add constraint players_full_name_required check (length(btrim(full_name)) > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'players_cedula_required') then
    alter table public.players add constraint players_cedula_required check (length(btrim(cedula)) > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from public.players
    where cedula is not null and btrim(cedula) <> ''
    group by tournament_id, lower(btrim(cedula))
    having count(*) > 1
  ) then
    create unique index if not exists players_tournament_cedula_unique_idx
      on public.players (tournament_id, lower(btrim(cedula)))
      where cedula is not null and btrim(cedula) <> '';
  end if;
end $$;

create or replace function public.enforce_player_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.full_name := btrim(new.full_name);
  new.cedula := btrim(new.cedula);
  if length(coalesce(new.full_name, '')) = 0 or length(coalesce(new.cedula, '')) = 0 then
    raise exception 'La cédula y el nombre completo son obligatorios';
  end if;
  if exists (
    select 1 from public.players p
    where p.tournament_id = new.tournament_id
      and lower(btrim(p.cedula)) = lower(new.cedula)
      and p.id is distinct from new.id
  ) then
    raise exception 'Esta cédula ya está registrada en otro equipo del torneo';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_player_identity_before_write on public.players;
create trigger enforce_player_identity_before_write
  before insert or update of tournament_id, cedula, full_name on public.players
  for each row execute function public.enforce_player_identity();

revoke all on function public.enforce_player_identity() from public, anon, authenticated;

alter table public.payments
  add column if not exists payment_method text default 'efectivo',
  add column if not exists notes text;

alter table public.matches
  add column if not exists resolved_by_penalties boolean default false,
  add column if not exists home_penalties integer,
  add column if not exists away_penalties integer,
  add column if not exists notes text;

create index if not exists payments_tournament_team_created_idx
  on public.payments (tournament_id, team_id, created_at desc);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists role text default 'organizer',
  add column if not exists saas_status text default 'active',
  add column if not exists max_tournaments integer default 1,
  add column if not exists archived_at timestamptz;

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_target_created_idx
  on public.admin_activity_log (target_id, created_at desc);

alter table public.admin_activity_log enable row level security;

insert into storage.buckets (id, name, public)
values ('identidad-torneos', 'identidad-torneos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('player-assets', 'player-assets', true)
on conflict (id) do update set public = true;

create or replace function public.can_manage_tournament_media(tournament_id_text text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id::text = tournament_id_text
      and (
        t.user_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'superadmin'
        )
      )
  );
$$;

revoke all on function public.can_manage_tournament_media(text) from public, anon;
grant execute on function public.can_manage_tournament_media(text) to authenticated;

create or replace function public.register_tournament_player(
  p_tournament_id uuid,
  p_team_id uuid,
  p_full_name text,
  p_cedula text
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_player public.players;
  v_cedula text := lower(btrim(p_cedula));
begin
  if not public.can_manage_tournament_media(p_tournament_id::text) then
    raise exception 'No tienes permiso para administrar este torneo';
  end if;
  if length(btrim(coalesce(p_full_name, ''))) = 0 or length(v_cedula) = 0 then
    raise exception 'La cédula y el nombre completo son obligatorios';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_tournament_id::text || ':' || v_cedula));
  perform pg_advisory_xact_lock(hashtext(p_tournament_id::text || ':team:' || p_team_id::text));
  select * into v_tournament from public.tournaments where id = p_tournament_id;
  if not exists (select 1 from public.teams where id = p_team_id and tournament_id = p_tournament_id) then
    raise exception 'El equipo no pertenece al torneo seleccionado';
  end if;
  if exists (select 1 from public.players where tournament_id = p_tournament_id and lower(btrim(cedula)) = v_cedula) then
    raise exception 'Esta cédula ya está registrada en otro equipo del torneo';
  end if;
  if coalesce(v_tournament.is_auto_template_enabled, false) and (
    select count(*) from public.players where tournament_id = p_tournament_id and team_id = p_team_id
  ) >= greatest(1, coalesce(v_tournament.max_players_per_team, 25)) then
    raise exception 'El equipo alcanzó el límite configurado de jugadores';
  end if;

  insert into public.players (tournament_id, team_id, full_name, cedula)
  values (p_tournament_id, p_team_id, btrim(p_full_name), btrim(p_cedula))
  returning * into v_player;
  return v_player;
end;
$$;

create or replace function public.update_tournament_player(
  p_player_id uuid,
  p_full_name text,
  p_cedula text
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.players;
  v_player public.players;
  v_cedula text := lower(btrim(p_cedula));
begin
  select * into v_existing from public.players where id = p_player_id;
  if v_existing.id is null or not public.can_manage_tournament_media(v_existing.tournament_id::text) then
    raise exception 'No tienes permiso para modificar este jugador';
  end if;
  if length(btrim(coalesce(p_full_name, ''))) = 0 or length(v_cedula) = 0 then
    raise exception 'La cédula y el nombre completo son obligatorios';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_existing.tournament_id::text || ':' || v_cedula));
  if exists (
    select 1 from public.players
    where tournament_id = v_existing.tournament_id
      and id <> p_player_id
      and lower(btrim(cedula)) = v_cedula
  ) then
    raise exception 'Esta cédula ya está registrada en otro equipo del torneo';
  end if;

  update public.players set full_name = btrim(p_full_name), cedula = btrim(p_cedula)
  where id = p_player_id returning * into v_player;
  return v_player;
end;
$$;

create or replace function public.delete_tournament_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
begin
  select tournament_id into v_tournament_id from public.players where id = p_player_id;
  if v_tournament_id is null or not public.can_manage_tournament_media(v_tournament_id::text) then
    raise exception 'No tienes permiso para eliminar este jugador';
  end if;
  delete from public.players where id = p_player_id;
end;
$$;

revoke all on function public.register_tournament_player(uuid, uuid, text, text) from public, anon;
revoke all on function public.update_tournament_player(uuid, text, text) from public, anon;
revoke all on function public.delete_tournament_player(uuid) from public, anon;
grant execute on function public.register_tournament_player(uuid, uuid, text, text) to authenticated;
grant execute on function public.update_tournament_player(uuid, text, text) to authenticated;
grant execute on function public.delete_tournament_player(uuid) to authenticated;

-- Las escrituras pasan únicamente por funciones atómicas con validación de tenant.
revoke insert, update, delete on public.players from authenticated;

alter table public.players enable row level security;

drop policy if exists players_manager_select on public.players;
create policy players_manager_select
  on public.players for select to authenticated
  using (public.can_manage_tournament_media(tournament_id::text));

revoke select on public.players from anon;
grant select on public.players to authenticated;

create or replace view public.public_players as
  select id, tournament_id, team_id, full_name, photo_url
  from public.players;

revoke all on public.public_players from public;
grant select on public.public_players to anon, authenticated;

drop policy if exists tournament_identity_upload on storage.objects;
create policy tournament_identity_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'identidad-torneos'
    and public.can_manage_tournament_media((storage.foldername(name))[1])
  );

drop policy if exists tournament_identity_update on storage.objects;
create policy tournament_identity_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'identidad-torneos'
    and public.can_manage_tournament_media((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'identidad-torneos'
    and public.can_manage_tournament_media((storage.foldername(name))[1])
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    saas_status,
    max_tournaments
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'organizer',
    'active',
    1
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

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

revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create table if not exists public.saas_payments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  concept text not null,
  notes text,
  collected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.saas_payments
  add column if not exists organizer_id uuid,
  add column if not exists amount numeric(12, 2),
  add column if not exists concept text,
  add column if not exists notes text,
  add column if not exists payment_method text default 'transferencia',
  add column if not exists collected_by uuid,
  add column if not exists created_at timestamptz default now();

create index if not exists saas_payments_organizer_id_idx
  on public.saas_payments (organizer_id);

create index if not exists saas_payments_created_at_idx
  on public.saas_payments (created_at desc);

alter table public.saas_payments enable row level security;

-- La tabla no necesita políticas públicas: las APIs protegidas del servidor
-- usan service_role y validan que el usuario autenticado sea superadmin.
