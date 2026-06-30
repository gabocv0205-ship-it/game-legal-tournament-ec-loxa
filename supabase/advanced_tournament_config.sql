-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Idempotente: solo agrega configuraciones avanzadas si aun no existen.

alter table public.tournaments
  add column if not exists knockout_pairing_mode text default 'general_table',
  add column if not exists substitution_rule text default 'limited',
  add column if not exists double_yellow_suspension_matches integer default 1,
  add column if not exists reset_yellows_on_knockout boolean default true;

alter table public.players
  add column if not exists eligibility_status text default 'active',
  add column if not exists eligibility_reason text,
  add column if not exists eligibility_updated_at timestamptz,
  add column if not exists eligibility_updated_by uuid references public.profiles(id) on delete set null;

alter table public.teams
  add column if not exists competition_status text default 'active',
  add column if not exists competition_status_reason text,
  add column if not exists competition_status_updated_at timestamptz,
  add column if not exists competition_status_updated_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tournaments_knockout_pairing_mode_check') then
    alter table public.tournaments
      add constraint tournaments_knockout_pairing_mode_check
      check (knockout_pairing_mode in ('general_table', 'group_cross', 'manual')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'tournaments_substitution_rule_check') then
    alter table public.tournaments
      add constraint tournaments_substitution_rule_check
      check (substitution_rule in ('limited', 'unlimited', 'reentry')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'players_eligibility_status_check') then
    alter table public.players
      add constraint players_eligibility_status_check
      check (eligibility_status in ('active', 'suspended', 'expelled', 'ineligible')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'teams_competition_status_check') then
    alter table public.teams
      add constraint teams_competition_status_check
      check (competition_status in ('active', 'suspended', 'eliminated')) not valid;
  end if;
end $$;

create or replace function public.update_player_eligibility(
  p_player_id uuid,
  p_status text,
  p_reason text default null
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
begin
  select * into v_player from public.players where id = p_player_id;
  if v_player.id is null then
    raise exception 'Jugador no encontrado';
  end if;
  if not public.can_manage_tournament(v_player.tournament_id, 'admin') then
    raise exception 'No tienes permiso para modificar el estado del jugador';
  end if;
  if p_status not in ('active', 'suspended', 'expelled', 'ineligible') then
    raise exception 'Estado disciplinario invalido';
  end if;

  update public.players
  set eligibility_status = p_status,
      eligibility_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      eligibility_updated_at = now(),
      eligibility_updated_by = auth.uid()
  where id = p_player_id
  returning * into v_player;

  return v_player;
end;
$$;

revoke all on function public.update_player_eligibility(uuid, text, text) from public, anon;
grant execute on function public.update_player_eligibility(uuid, text, text) to authenticated;

create or replace function public.update_team_competition_status(
  p_team_id uuid,
  p_status text,
  p_reason text default null
)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams;
begin
  select * into v_team from public.teams where id = p_team_id;
  if v_team.id is null then
    raise exception 'Equipo no encontrado';
  end if;
  if not public.can_manage_tournament(v_team.tournament_id, 'admin') then
    raise exception 'No tienes permiso para modificar el estado del equipo';
  end if;
  if p_status not in ('active', 'suspended', 'eliminated') then
    raise exception 'Estado de equipo invalido';
  end if;

  update public.teams
  set competition_status = p_status,
      competition_status_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      competition_status_updated_at = now(),
      competition_status_updated_by = auth.uid()
  where id = p_team_id
  returning * into v_team;

  return v_team;
end;
$$;

revoke all on function public.update_team_competition_status(uuid, text, text) from public, anon;
grant execute on function public.update_team_competition_status(uuid, text, text) to authenticated;
