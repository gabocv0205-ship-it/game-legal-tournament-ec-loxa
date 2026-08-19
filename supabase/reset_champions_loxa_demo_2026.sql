-- Reinicio protegido de la demostracion CHAMPIONS LOXA 2026.
-- Ejecutar completo en Supabase SQL Editor con el rol postgres.
-- Este script aborta antes de borrar datos si no encuentra exactamente:
--   * un torneo activo llamado CHAMPIONS LOXA 2026;
--   * 32 equipos distribuidos en 8 grupos de 4;
--   * un equipo llamado MANCHESTER UNITED.

begin;

do $$
declare
  v_tournament_id uuid;
  v_team_id uuid;
  v_group_count integer;
  v_grouped_teams integer;
begin
  if (select count(*) from public.tournaments where lower(btrim(name)) = 'champions loxa 2026' and status is distinct from 'deleted') <> 1 then
    raise exception 'Proteccion activa: debe existir exactamente un torneo activo llamado CHAMPIONS LOXA 2026';
  end if;

  select id into v_tournament_id
  from public.tournaments
  where lower(btrim(name)) = 'champions loxa 2026' and status is distinct from 'deleted';

  if (select count(*) from public.teams where tournament_id = v_tournament_id) <> 32 then
    raise exception 'Proteccion activa: CHAMPIONS LOXA 2026 debe tener exactamente 32 equipos';
  end if;

  select count(distinct group_name), count(*) filter (where nullif(btrim(group_name), '') is not null)
  into v_group_count, v_grouped_teams
  from public.teams
  where tournament_id = v_tournament_id;

  if v_group_count <> 8 or v_grouped_teams <> 32 or exists (
    select 1
    from public.teams
    where tournament_id = v_tournament_id
    group by group_name
    having count(*) <> 4
  ) then
    raise exception 'Proteccion activa: se requieren 8 grupos completos de 4 equipos';
  end if;

  if (select count(*) from public.teams where tournament_id = v_tournament_id and lower(btrim(name)) = 'manchester united') <> 1 then
    raise exception 'Proteccion activa: debe existir exactamente un equipo llamado MANCHESTER UNITED';
  end if;

  select id into v_team_id
  from public.teams
  where tournament_id = v_tournament_id and lower(btrim(name)) = 'manchester united';

  if exists (
    select 1
    from public.players
    where tournament_id = v_tournament_id
      and team_id = v_team_id
      and cedula not like 'DEMO-MU08-%'
      and jersey_number in (1,2,3,4,5,6,7,8,9,10,11,13,16,17,18,19,20,21,22,23,24,29,32)
  ) then
    raise exception 'Manchester United ya tiene jugadores reales con dorsales de la plantilla demo. No se modifico ningun dato';
  end if;
end $$;

create temporary table demo_target on commit drop as
select t.id as tournament_id, mu.id as team_id
from public.tournaments t
join public.teams mu on mu.tournament_id = t.id
where lower(btrim(t.name)) = 'champions loxa 2026'
  and t.status is distinct from 'deleted'
  and lower(btrim(mu.name)) = 'manchester united';

-- Elimina estadisticas y calendarios anteriores solo del torneo demo.
delete from public.financial_ledger ledger
using demo_target target
where ledger.tournament_id = target.tournament_id
  and ledger.reference_type in ('matches', 'match_events');

delete from public.match_events event
using public.matches match, demo_target target
where event.match_id = match.id
  and match.tournament_id = target.tournament_id;

delete from public.matches match
using demo_target target
where match.tournament_id = target.tournament_id;

-- Reemplaza solamente jugadores previamente creados por esta demostracion.
delete from public.players player
using demo_target target
where player.tournament_id = target.tournament_id
  and player.team_id = target.team_id
  and player.cedula like 'DEMO-MU08-%';

insert into public.players (tournament_id, team_id, full_name, cedula, jersey_number)
select target.tournament_id, target.team_id, roster.full_name, roster.cedula, roster.jersey_number
from demo_target target
cross join (values
  ('Edwin van der Sar', 'DEMO-MU08-001', 1),
  ('Gary Neville', 'DEMO-MU08-002', 2),
  ('Patrice Evra', 'DEMO-MU08-003', 3),
  ('Owen Hargreaves', 'DEMO-MU08-004', 4),
  ('Rio Ferdinand', 'DEMO-MU08-005', 5),
  ('Wes Brown', 'DEMO-MU08-006', 6),
  ('Cristiano Ronaldo', 'DEMO-MU08-007', 7),
  ('Anderson', 'DEMO-MU08-008', 8),
  ('Louis Saha', 'DEMO-MU08-009', 9),
  ('Wayne Rooney', 'DEMO-MU08-010', 10),
  ('Ryan Giggs', 'DEMO-MU08-011', 11),
  ('Park Ji-sung', 'DEMO-MU08-013', 13),
  ('Michael Carrick', 'DEMO-MU08-016', 16),
  ('Nani', 'DEMO-MU08-017', 17),
  ('Paul Scholes', 'DEMO-MU08-018', 18),
  ('Gerard Pique', 'DEMO-MU08-019', 19),
  ('Fabio da Silva', 'DEMO-MU08-020', 20),
  ('Rafael da Silva', 'DEMO-MU08-021', 21),
  ('John O''Shea', 'DEMO-MU08-022', 22),
  ('Jonny Evans', 'DEMO-MU08-023', 23),
  ('Darren Fletcher', 'DEMO-MU08-024', 24),
  ('Tomasz Kuszczak', 'DEMO-MU08-029', 29),
  ('Carlos Tevez', 'DEMO-MU08-032', 32)
) as roster(full_name, cedula, jersey_number)
where not exists (
  select 1 from public.players existing
  where existing.tournament_id = target.tournament_id
    and (lower(btrim(existing.cedula)) = lower(roster.cedula)
      or (existing.team_id = target.team_id and existing.jersey_number = roster.jersey_number))
);

-- Primera fecha demostrativa: dos cruces por grupo, resultados terminados y
-- horarios distribuidos en dos canchas. No genera pagos ni cargos de arbitraje.
create temporary table demo_first_matchday (
  id uuid primary key,
  tournament_id uuid not null,
  home_team_id uuid not null,
  away_team_id uuid not null,
  match_date timestamptz not null,
  matchday integer not null,
  stage text not null,
  status text not null,
  court text not null,
  home_goals integer not null,
  away_goals integer not null,
  notes text
) on commit drop;

with ranked_teams as (
  select team.id, team.name, team.group_name,
    row_number() over (partition by team.group_name order by team.name, team.id) as group_position
  from public.teams team
  join demo_target target on target.tournament_id = team.tournament_id
), pairs as (
  select home.id as home_team_id, away.id as away_team_id,
    row_number() over (order by home.group_name, home.group_position) as match_number
  from ranked_teams home
  join ranked_teams away on away.group_name = home.group_name
    and away.group_position = case home.group_position when 1 then 4 when 2 then 3 end
  where home.group_position in (1, 2)
)
insert into demo_first_matchday
select gen_random_uuid(), target.tournament_id, pairs.home_team_id, pairs.away_team_id,
  date_trunc('day', now()) + interval '3 days' + interval '09 hours'
    + ((pairs.match_number - 1) / 2) * interval '60 minutes',
  1, 'Fase de Grupos', 'finished',
  case when pairs.match_number % 2 = 1 then 'Cancha 1' else 'Cancha 2' end,
  case when pairs.home_team_id = target.team_id then 3 when pairs.away_team_id = target.team_id then 1 else 1 + (pairs.match_number % 3) end,
  case when pairs.away_team_id = target.team_id then 3 when pairs.home_team_id = target.team_id then 1 else pairs.match_number % 2 end,
  'Partido ficticio generado para la demostracion comercial'
from pairs cross join demo_target target;

insert into public.matches (
  id, tournament_id, home_team_id, away_team_id, match_date, matchday,
  stage, status, court, home_goals, away_goals, notes
)
select id, tournament_id, home_team_id, away_team_id, match_date, matchday,
  stage, status, court, home_goals, away_goals, notes
from demo_first_matchday;

-- Goleadores ficticios del partido de Manchester United para que la demo
-- muestre estadisticas de jugadores sin usar documentos reales.
with united_match as (
  select match.id
  from demo_first_matchday match
  join demo_target target on target.team_id in (match.home_team_id, match.away_team_id)
  limit 1
), scorers as (
  select player.id, player.team_id, player.jersey_number
  from public.players player
  join demo_target target on target.team_id = player.team_id
  where player.cedula like 'DEMO-MU08-%' and player.jersey_number in (7, 10)
)
insert into public.match_events (match_id, player_id, team_id, event_type, minute)
select united_match.id, scorers.id, scorers.team_id, 'gol', minutes.minute
from united_match
join scorers on true
join lateral (
  select unnest(case when scorers.jersey_number = 7 then array[18, 62] else array[44] end) as minute
) minutes on true;

commit;

select
  tournament.name as torneo,
  (select count(*) from public.matches where tournament_id = tournament.id) as partidos_demo,
  (select count(*) from public.players player join public.teams team on team.id = player.team_id where team.tournament_id = tournament.id and lower(btrim(team.name)) = 'manchester united') as jugadores_manchester_united
from public.tournaments tournament
where lower(btrim(tournament.name)) = 'champions loxa 2026'
  and tournament.status is distinct from 'deleted';
