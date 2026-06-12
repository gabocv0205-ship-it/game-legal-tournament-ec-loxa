export type TournamentConfig = {
  format: string;
  group_count: number;
  teams_per_group: number;
  qualifiers_per_group: number;
  repechage_enabled: boolean;
  repechage_slots: number;
  knockout_legs: number;
  final_legs: number;
  court_count: number;
  operating_start_time: string;
  operating_end_time: string;
  match_duration_minutes: number;
  yellow_cards_for_suspension: number;
  yellow_suspension_matches: number;
  red_suspension_matches: number;
};

export const DEFAULT_TOURNAMENT_CONFIG: TournamentConfig = {
  format: "grupos_eliminatoria",
  group_count: 1,
  teams_per_group: 4,
  qualifiers_per_group: 2,
  repechage_enabled: false,
  repechage_slots: 0,
  knockout_legs: 1,
  final_legs: 1,
  court_count: 1,
  operating_start_time: "09:00",
  operating_end_time: "18:00",
  match_duration_minutes: 60,
  yellow_cards_for_suspension: 3,
  yellow_suspension_matches: 1,
  red_suspension_matches: 1,
};

export function normalizeTournamentConfig(source: any): TournamentConfig {
  const number = (key: keyof TournamentConfig, minimum = 1) =>
    Math.max(minimum, Number(source?.[key] ?? DEFAULT_TOURNAMENT_CONFIG[key]));

  return {
    format: source?.format || DEFAULT_TOURNAMENT_CONFIG.format,
    group_count: number("group_count"),
    teams_per_group: number("teams_per_group"),
    qualifiers_per_group: number("qualifiers_per_group"),
    repechage_enabled: Boolean(source?.repechage_enabled),
    repechage_slots: number("repechage_slots", 0),
    knockout_legs: number("knockout_legs"),
    final_legs: number("final_legs"),
    court_count: number("court_count"),
    operating_start_time: source?.operating_start_time || DEFAULT_TOURNAMENT_CONFIG.operating_start_time,
    operating_end_time: source?.operating_end_time || DEFAULT_TOURNAMENT_CONFIG.operating_end_time,
    match_duration_minutes: number("match_duration_minutes", 15),
    yellow_cards_for_suspension: number("yellow_cards_for_suspension"),
    yellow_suspension_matches: number("yellow_suspension_matches"),
    red_suspension_matches: number("red_suspension_matches"),
  };
}

export function sortStandings(a: any, b: any) {
  return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.fairPlay - b.fairPlay || a.name.localeCompare(b.name);
}

export function calculateStandings(teams: any[], matches: any[], events: any[] = [], config?: Partial<TournamentConfig>) {
  const rules = normalizeTournamentConfig(config);
  const fairPlayByTeam: Record<string, number> = {};
  events.forEach((event) => {
    fairPlayByTeam[event.team_id] = (fairPlayByTeam[event.team_id] || 0) + (event.event_type === "roja" ? 3 : event.event_type === "amarilla" ? 1 : 0);
  });

  const standings: Record<string, any> = {};
  teams.forEach((team) => {
    standings[team.id] = {
      id: team.id, name: team.name, shield: team.shield_url, group: team.group_name || "General",
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, gd: 0, pts: 0, fairPlay: fairPlayByTeam[team.id] || 0,
      classificationStatus: "eliminated",
    };
  });

  matches.filter((match) => match.status === "finished").forEach((match) => {
    const home = standings[match.home_team_id];
    const away = standings[match.away_team_id];
    if (!home || !away) return;
    const homeGoals = Number(match.home_goals || 0);
    const awayGoals = Number(match.away_goals || 0);
    home.pj++; away.pj++;
    home.gf += homeGoals; home.gc += awayGoals;
    away.gf += awayGoals; away.gc += homeGoals;
    if (homeGoals > awayGoals) { home.pg++; home.pts += 3; away.pp++; }
    else if (awayGoals > homeGoals) { away.pg++; away.pts += 3; home.pp++; }
    else { home.pe++; away.pe++; home.pts++; away.pts++; }
  });

  const groups = Object.values(standings).reduce<Record<string, any[]>>((acc, team: any) => {
    (acc[team.group] ||= []).push(team);
    return acc;
  }, {});

  Object.values(groups).forEach((group) => {
    group.forEach((team) => { team.gd = team.gf - team.gc; });
    group.sort(sortStandings);
    group.forEach((team, index) => {
      if (index < rules.qualifiers_per_group) team.classificationStatus = "qualified";
      else if (rules.repechage_enabled && index < rules.qualifiers_per_group + rules.repechage_slots) team.classificationStatus = "repechage";
    });
  });

  return groups;
}

export function getQualifiedTeams(groups: Record<string, any[]>, includeRepechage = false) {
  return Object.values(groups)
    .flat()
    .filter((team) => team.classificationStatus === "qualified" || (includeRepechage && team.classificationStatus === "repechage"))
    .sort(sortStandings);
}

export function createMatchdayFixtures(teams: any[], existingMatches: any[], tournamentId: string, matchday: number, stage: string) {
  const existingPairs = new Set(existingMatches.map((match) => [match.home_team_id, match.away_team_id].sort().join(":")));
  const groups = teams.reduce<Record<string, any[]>>((acc, team) => {
    (acc[team.group_name || "General"] ||= []).push(team);
    return acc;
  }, {});
  const fixtures: any[] = [];

  Object.values(groups).forEach((group) => {
    const rotation = [...group].sort((a, b) => a.name.localeCompare(b.name));
    if (rotation.length % 2) rotation.push({ id: "__bye__" });
    const rounds = rotation.length - 1;
    const roundIndex = Math.max(0, (matchday - 1) % rounds);
    const fixed = rotation[0];
    const rotating = rotation.slice(1);
    const shifted = rotating.map((_, index) => rotating[(index + roundIndex) % rotating.length]);
    const round = [fixed, ...shifted];

    for (let index = 0; index < round.length / 2; index++) {
      const home = round[index];
      const away = round[round.length - 1 - index];
      if (home.id === "__bye__" || away.id === "__bye__") continue;
      const key = [home.id, away.id].sort().join(":");
      if (!existingPairs.has(key)) {
        fixtures.push({ tournament_id: tournamentId, home_team_id: home.id, away_team_id: away.id, matchday, stage });
        existingPairs.add(key);
      }
    }
  });
  return fixtures;
}

export function scheduleFixtures(fixtures: any[], day: string, config: TournamentConfig) {
  const start = new Date(`${day}T${config.operating_start_time}:00`);
  const end = new Date(`${day}T${config.operating_end_time}:00`);
  return fixtures.map((fixture, index) => {
    const slot = Math.floor(index / config.court_count);
    const date = new Date(start.getTime() + slot * config.match_duration_minutes * 60000);
    if (date >= end) throw new Error("La jornada supera el horario de funcionamiento configurado.");
    return { ...fixture, court: `Cancha ${(index % config.court_count) + 1}`, match_date: date.toISOString() };
  });
}

export function createKnockoutFixtures(qualified: any[], tournamentId: string, stage: string, matchday: number, legs: number) {
  const fixtures: any[] = [];
  for (let index = 0; index < qualified.length / 2; index++) {
    const best = qualified[index];
    const worst = qualified[qualified.length - 1 - index];
    fixtures.push({ tournament_id: tournamentId, home_team_id: best.id, away_team_id: worst.id, matchday, stage });
    if (legs === 2) fixtures.push({ tournament_id: tournamentId, home_team_id: worst.id, away_team_id: best.id, matchday: matchday + 1, stage: `${stage} (Vuelta)` });
  }
  return fixtures;
}

export function getStageWinners(matches: any[], teams: any[], stage: string) {
  const teamById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const ties: Record<string, { first: string; second: string; firstGoals: number; secondGoals: number; finished: number; total: number }> = {};
  matches.filter((match) => match.stage === stage || match.stage === `${stage} (Vuelta)`).forEach((match) => {
    const pair = [match.home_team_id, match.away_team_id].sort();
    const key = pair.join(":");
    const tie = ties[key] ||= { first: pair[0], second: pair[1], firstGoals: 0, secondGoals: 0, finished: 0, total: 0 };
    tie.total++;
    if (match.status !== "finished") return;
    tie.finished++;
    if (match.home_team_id === tie.first) {
      tie.firstGoals += Number(match.home_goals || 0);
      tie.secondGoals += Number(match.away_goals || 0);
    } else {
      tie.firstGoals += Number(match.away_goals || 0);
      tie.secondGoals += Number(match.home_goals || 0);
    }
  });
  return Object.values(ties)
    .filter((tie) => tie.finished === tie.total && tie.firstGoals !== tie.secondGoals)
    .map((tie) => teamById[tie.firstGoals > tie.secondGoals ? tie.first : tie.second])
    .filter(Boolean);
}
