-- Dorsales de jugadores: migracion segura e idempotente.
-- Ejecutar despues de supabase/saas_setup.sql en Supabase > SQL Editor.
-- Los jugadores existentes se conservan; los nuevos registros gestionados por la app requieren dorsal 1-99.

alter table public.players
  add column if not exists jersey_number integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'players_jersey_number_range'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_jersey_number_range
      check (jersey_number is null or jersey_number between 1 and 99)
      not valid;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from public.players
    where jersey_number is not null
    group by tournament_id, team_id, jersey_number
    having count(*) > 1
  ) then
    raise exception 'No se pudo crear la regla de dorsales porque existen duplicados. Corrija los duplicados y ejecute nuevamente esta migracion.';
  end if;

  create unique index if not exists players_tournament_team_jersey_unique_idx
    on public.players (tournament_id, team_id, jersey_number)
    where jersey_number is not null;
end $$;

create index if not exists players_tournament_team_jersey_lookup_idx
  on public.players (tournament_id, team_id, jersey_number);

create or replace function public.register_tournament_player(
  p_tournament_id uuid,
  p_team_id uuid,
  p_full_name text,
  p_cedula text,
  p_jersey_number integer
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
    raise exception 'La cedula y el nombre completo son obligatorios';
  end if;
  if p_jersey_number is null or p_jersey_number < 1 or p_jersey_number > 99 then
    raise exception 'El dorsal debe ser un numero entero entre 1 y 99';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_tournament_id::text || ':' || v_cedula));
  perform pg_advisory_xact_lock(hashtext(p_tournament_id::text || ':team:' || p_team_id::text));
  perform pg_advisory_xact_lock(hashtext(p_tournament_id::text || ':team:' || p_team_id::text || ':jersey:' || p_jersey_number::text));
  select * into v_tournament from public.tournaments where id = p_tournament_id;
  if not exists (select 1 from public.teams where id = p_team_id and tournament_id = p_tournament_id) then
    raise exception 'El equipo no pertenece al torneo seleccionado';
  end if;
  if exists (select 1 from public.players where tournament_id = p_tournament_id and lower(btrim(cedula)) = v_cedula) then
    raise exception 'Esta cedula ya esta registrada en otro equipo del torneo';
  end if;
  if exists (select 1 from public.players where tournament_id = p_tournament_id and team_id = p_team_id and jersey_number = p_jersey_number) then
    raise exception 'El dorsal ya esta registrado para otro jugador de este equipo';
  end if;
  if coalesce(v_tournament.is_auto_template_enabled, false) and (
    select count(*) from public.players where tournament_id = p_tournament_id and team_id = p_team_id
  ) >= greatest(1, coalesce(v_tournament.max_players_per_team, 25)) then
    raise exception 'El equipo alcanzo el limite configurado de jugadores';
  end if;

  insert into public.players (tournament_id, team_id, full_name, cedula, jersey_number)
  values (p_tournament_id, p_team_id, btrim(p_full_name), btrim(p_cedula), p_jersey_number)
  returning * into v_player;
  return v_player;
end;
$$;

create or replace function public.update_tournament_player(
  p_player_id uuid,
  p_full_name text,
  p_cedula text,
  p_jersey_number integer
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
    raise exception 'La cedula y el nombre completo son obligatorios';
  end if;
  if p_jersey_number is null or p_jersey_number < 1 or p_jersey_number > 99 then
    raise exception 'El dorsal debe ser un numero entero entre 1 y 99';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_existing.tournament_id::text || ':' || v_cedula));
  perform pg_advisory_xact_lock(hashtext(v_existing.tournament_id::text || ':team:' || v_existing.team_id::text || ':jersey:' || p_jersey_number::text));
  if exists (
    select 1 from public.players
    where tournament_id = v_existing.tournament_id
      and id <> p_player_id
      and lower(btrim(cedula)) = v_cedula
  ) then
    raise exception 'Esta cedula ya esta registrada en otro equipo del torneo';
  end if;
  if exists (
    select 1 from public.players
    where tournament_id = v_existing.tournament_id
      and team_id = v_existing.team_id
      and id <> p_player_id
      and jersey_number = p_jersey_number
  ) then
    raise exception 'El dorsal ya esta registrado para otro jugador de este equipo';
  end if;

  update public.players
  set full_name = btrim(p_full_name), cedula = btrim(p_cedula), jersey_number = p_jersey_number
  where id = p_player_id
  returning * into v_player;
  return v_player;
end;
$$;

-- Retira las firmas antiguas para que nadie pueda registrar jugadores sin dorsal.
revoke all on function public.register_tournament_player(uuid, uuid, text, text, integer) from public, anon;
revoke all on function public.update_tournament_player(uuid, text, text, integer) from public, anon;

do $$
begin
  if to_regprocedure('public.register_tournament_player(uuid,uuid,text,text)') is not null then
    execute 'revoke all on function public.register_tournament_player(uuid, uuid, text, text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.update_tournament_player(uuid,text,text)') is not null then
    execute 'revoke all on function public.update_tournament_player(uuid, text, text) from public, anon, authenticated';
  end if;
end $$;
grant execute on function public.register_tournament_player(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.update_tournament_player(uuid, text, text, integer) to authenticated;
