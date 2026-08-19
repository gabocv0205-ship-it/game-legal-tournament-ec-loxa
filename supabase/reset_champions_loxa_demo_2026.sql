-- Reinicio protegido de la demostracion CHAMPIONS LOXA 2026.
-- Ejecutar el contenido completo en Supabase SQL Editor con el rol postgres.
-- No usa tablas temporales: toda la operacion ocurre dentro de un unico bloque
-- atomico. Si alguna validacion falla, PostgreSQL revierte todos los cambios.

do $$
declare
  v_tournament_id uuid;
  v_team_id uuid;
  v_group_count integer;
  v_grouped_teams integer;
  v_match_number integer := 0;
  v_match_id uuid;
  v_united_match_id uuid;
  v_home_goals integer;
  v_away_goals integer;
  v_fixture record;
begin
  if (
    select count(*)
    from public.tournaments
    where lower(btrim(name)) = 'champions loxa 2026'
      and status is distinct from 'deleted'
  ) <> 1 then
    raise exception 'Proteccion activa: debe existir exactamente un torneo activo llamado CHAMPIONS LOXA 2026';
  end if;

  select id into v_tournament_id
  from public.tournaments
  where lower(btrim(name)) = 'champions loxa 2026'
    and status is distinct from 'deleted';

  if (select count(*) from public.teams where tournament_id = v_tournament_id) <> 32 then
    raise exception 'Proteccion activa: CHAMPIONS LOXA 2026 debe tener exactamente 32 equipos';
  end if;

  select
    count(distinct group_name),
    count(*) filter (where nullif(btrim(group_name), '') is not null)
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

  if (
    select count(*)
    from public.teams
    where tournament_id = v_tournament_id
      and lower(btrim(name)) = 'manchester united'
  ) <> 1 then
    raise exception 'Proteccion activa: debe existir exactamente un equipo llamado MANCHESTER UNITED';
  end if;

  select id into v_team_id
  from public.teams
  where tournament_id = v_tournament_id
    and lower(btrim(name)) = 'manchester united';

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

  -- Limpia estadisticas, calendarios y cargos derivados exclusivamente de
  -- partidos del torneo demo. Inscripciones y pagos se conservan.
  delete from public.financial_ledger
  where tournament_id = v_tournament_id
    and reference_type in ('matches', 'match_events');

  delete from public.match_events
  where match_id in (
    select id from public.matches where tournament_id = v_tournament_id
  );

  delete from public.matches
  where tournament_id = v_tournament_id;

  delete from public.players
  where tournament_id = v_tournament_id
    and team_id = v_team_id
    and cedula like 'DEMO-MU08-%';

  insert into public.players (tournament_id, team_id, full_name, cedula, jersey_number)
  select v_tournament_id, v_team_id, roster.full_name, roster.cedula, roster.jersey_number
  from (values
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
    select 1
    from public.players existing
    where existing.tournament_id = v_tournament_id
      and (
        lower(btrim(existing.cedula)) = lower(roster.cedula)
        or (existing.team_id = v_team_id and existing.jersey_number = roster.jersey_number)
      )
  );

  -- Genera dos partidos por grupo. El bloque completo sigue siendo atomico y
  -- no depende de tablas temporales ni de la persistencia de una conexion.
  for v_fixture in
    with ranked_teams as (
      select
        team.id,
        team.name,
        team.group_name,
        row_number() over (
          partition by team.group_name
          order by team.name, team.id
        ) as group_position
      from public.teams team
      where team.tournament_id = v_tournament_id
    )
    select
      home.id as home_team_id,
      away.id as away_team_id,
      home.group_name
    from ranked_teams home
    join ranked_teams away
      on away.group_name = home.group_name
      and away.group_position = case home.group_position when 1 then 4 when 2 then 3 end
    where home.group_position in (1, 2)
    order by home.group_name, home.group_position
  loop
    v_match_number := v_match_number + 1;
    v_match_id := gen_random_uuid();

    if v_fixture.home_team_id = v_team_id then
      v_home_goals := 3;
      v_away_goals := 1;
      v_united_match_id := v_match_id;
    elsif v_fixture.away_team_id = v_team_id then
      v_home_goals := 1;
      v_away_goals := 3;
      v_united_match_id := v_match_id;
    else
      v_home_goals := 1 + (v_match_number % 3);
      v_away_goals := v_match_number % 2;
    end if;

    insert into public.matches (
      id, tournament_id, home_team_id, away_team_id, match_date, matchday,
      stage, status, court, home_goals, away_goals, notes
    ) values (
      v_match_id,
      v_tournament_id,
      v_fixture.home_team_id,
      v_fixture.away_team_id,
      date_trunc('day', now()) + interval '3 days' + interval '09 hours'
        + ((v_match_number - 1) / 2) * interval '60 minutes',
      1,
      'Fase de Grupos',
      'finished',
      case when v_match_number % 2 = 1 then 'Cancha 1' else 'Cancha 2' end,
      v_home_goals,
      v_away_goals,
      'Partido ficticio generado para la demostracion comercial'
    );
  end loop;

  if v_match_number <> 16 then
    raise exception 'Proteccion activa: la primera fecha no genero exactamente 16 partidos';
  end if;

  if v_united_match_id is null then
    raise exception 'Proteccion activa: Manchester United no fue incluido en la primera fecha';
  end if;

  insert into public.match_events (match_id, player_id, team_id, event_type, minute)
  select v_united_match_id, player.id, v_team_id, 'gol', 18
  from public.players player
  where player.tournament_id = v_tournament_id
    and player.team_id = v_team_id
    and player.cedula = 'DEMO-MU08-007';

  insert into public.match_events (match_id, player_id, team_id, event_type, minute)
  select v_united_match_id, player.id, v_team_id, 'gol', 62
  from public.players player
  where player.tournament_id = v_tournament_id
    and player.team_id = v_team_id
    and player.cedula = 'DEMO-MU08-007';

  insert into public.match_events (match_id, player_id, team_id, event_type, minute)
  select v_united_match_id, player.id, v_team_id, 'gol', 44
  from public.players player
  where player.tournament_id = v_tournament_id
    and player.team_id = v_team_id
    and player.cedula = 'DEMO-MU08-010';
end $$;

select
  tournament.name as torneo,
  (select count(*) from public.matches where tournament_id = tournament.id) as partidos_demo,
  (
    select count(*)
    from public.players player
    join public.teams team on team.id = player.team_id
    where team.tournament_id = tournament.id
      and lower(btrim(team.name)) = 'manchester united'
  ) as jugadores_manchester_united
from public.tournaments tournament
where lower(btrim(tournament.name)) = 'champions loxa 2026'
  and tournament.status is distinct from 'deleted';
