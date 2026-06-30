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
  match_duration_minutes: number;
  break_between_matches_minutes: number;
  football_modality: number;
  substitutes_count: number;
  final_venue: string;
  tournament_year: number;
  yellow_cards_for_suspension: number;
  yellow_suspension_matches: number;
  red_suspension_matches: number;
  double_yellow_suspension_matches: number;
  reset_yellows_on_knockout: boolean;
  max_players_per_team: number;
  knockout_pairing_mode: "general_table" | "group_cross" | "manual";
  substitution_rule: "limited" | "unlimited" | "reentry";
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
  match_duration_minutes: 60,
  break_between_matches_minutes: 10,
  football_modality: 11,
  substitutes_count: 5,
  final_venue: "",
  tournament_year: new Date().getFullYear(),
  yellow_cards_for_suspension: 3,
  yellow_suspension_matches: 1,
  red_suspension_matches: 2,
  double_yellow_suspension_matches: 1,
  reset_yellows_on_knockout: true,
  max_players_per_team: 25,
  knockout_pairing_mode: "general_table",
  substitution_rule: "limited",
};

export function normalizeTournamentConfig(source: any): TournamentConfig {
  const number = (key: keyof TournamentConfig, minimum = 1) =>
    Math.max(minimum, Number(source?.[key] ?? DEFAULT_TOURNAMENT_CONFIG[key]));
  const knockoutMode = ["general_table", "group_cross", "manual"].includes(String(source?.knockout_pairing_mode))
    ? source.knockout_pairing_mode
    : DEFAULT_TOURNAMENT_CONFIG.knockout_pairing_mode;
  const substitutionRule = ["limited", "unlimited", "reentry"].includes(String(source?.substitution_rule))
    ? source.substitution_rule
    : DEFAULT_TOURNAMENT_CONFIG.substitution_rule;

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
    match_duration_minutes: number("match_duration_minutes", 15),
    break_between_matches_minutes: number("break_between_matches_minutes", 0),
    football_modality: number("football_modality"),
    substitutes_count: number("substitutes_count", 0),
    final_venue: source?.final_venue || "",
    tournament_year: number("tournament_year", 2000),
    yellow_cards_for_suspension: number("yellow_cards_for_suspension"),
    yellow_suspension_matches: number("yellow_suspension_matches"),
    red_suspension_matches: number("red_suspension_matches"),
    double_yellow_suspension_matches: number("double_yellow_suspension_matches"),
    reset_yellows_on_knockout: source?.reset_yellows_on_knockout !== false,
    max_players_per_team: number("max_players_per_team"),
    knockout_pairing_mode: knockoutMode,
    substitution_rule: substitutionRule,
  };
}

export function getSuspendedPlayerIdsForMatch(events: any[], matches: any[], config: Partial<TournamentConfig>, targetMatch: any) {
  const rules = normalizeTournamentConfig(config);
  const matchById = Object.fromEntries(matches.map((match) => [match.id, match]));
  const matchOrder = (match: any) => {
    const timestamp = match?.match_date ? new Date(match.match_date).getTime() : 0;
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Number(match?.matchday || 0) * 86400000;
  };
  const targetOrder = matchOrder(targetMatch);
  const yellowCount: Record<string, number> = {};
  const suspended = new Set<string>();
  const targetIsKnockout = baseStage(targetMatch?.stage) !== "Fase de Grupos";
  const yellowEventsByMatchPlayer: Record<string, number> = {};

  events.forEach((event) => {
    if (event.event_type === "amarilla" && event.match_id && event.player_id) {
      const key = `${event.match_id}:${event.player_id}`;
      yellowEventsByMatchPlayer[key] = (yellowEventsByMatchPlayer[key] || 0) + 1;
    }
  });

  [...events]
    .filter((event) => event.player_id && event.team_id && matchById[event.match_id]?.status === "finished" && matchOrder(matchById[event.match_id]) < targetOrder)
    .sort((a, b) => matchOrder(matchById[a.match_id]) - matchOrder(matchById[b.match_id]))
    .forEach((event) => {
      let suspensionMatches = 0;
      if (event.event_type === "roja") {
        suspensionMatches = rules.red_suspension_matches;
      } else if (event.event_type === "amarilla") {
        if (yellowEventsByMatchPlayer[`${event.match_id}:${event.player_id}`] >= 2) {
          suspensionMatches = Math.max(suspensionMatches, rules.double_yellow_suspension_matches);
        }
        if (rules.reset_yellows_on_knockout && targetIsKnockout && baseStage(matchById[event.match_id]?.stage) === "Fase de Grupos") {
          if (!suspensionMatches) return;
        }
        yellowCount[event.player_id] = (yellowCount[event.player_id] || 0) + 1;
        if (yellowCount[event.player_id] % rules.yellow_cards_for_suspension === 0) suspensionMatches = rules.yellow_suspension_matches;
      }
      if (!suspensionMatches) return;
      const eventOrder = matchOrder(matchById[event.match_id]);
      const nextTeamMatches = matches
        .filter((match) => matchOrder(match) > eventOrder && (match.home_team_id === event.team_id || match.away_team_id === event.team_id))
        .sort((a, b) => matchOrder(a) - matchOrder(b))
        .slice(0, suspensionMatches);
      if (nextTeamMatches.some((match) => match.id === targetMatch.id)) suspended.add(event.player_id);
    });

  return suspended;
}

export function sortStandings(a: any, b: any) {
  return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.fairPlay - b.fairPlay || a.name.localeCompare(b.name);
}

export function calculateStandings(teams: any[], matches: any[], events: any[] = [], config?: Partial<TournamentConfig>) {
  const rules = normalizeTournamentConfig(config);
  const teamGroupById = Object.fromEntries(teams.map((team) => [team.id, team.group_name || "General"]));
  const eligibleMatches = matches.filter((match) => {
    if (match.status !== "finished") return false;
    const homeGroup = teamGroupById[match.home_team_id];
    const awayGroup = teamGroupById[match.away_team_id];
    if (!homeGroup || !awayGroup) return false;
    return homeGroup === awayGroup;
  });
  const eligibleMatchIds = new Set(eligibleMatches.map((match) => match.id).filter(Boolean));
  const fairPlayByTeam: Record<string, number> = {};
  events.forEach((event) => {
    if (event.match_id && !eligibleMatchIds.has(event.match_id)) return;
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

  eligibleMatches.forEach((match) => {
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
      team.groupRank = index + 1;
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

export function createMatchdayFixtures(teams: any[], existingMatches: any[], tournamentId: string, matchday: number, stage: string, options: { legs?: number } = {}) {
  const legs = Math.max(1, Math.min(2, Number(options.legs || 1)));
  const relevantMatches = existingMatches.filter((match) => match.stage === stage || (legs === 2 && match.stage === `${stage} (Vuelta)`));
  const existingDirectedPairs = new Set(relevantMatches.map((match) => `${match.home_team_id}:${match.away_team_id}`));
  const existingPairs = new Set(relevantMatches.map((match) => [match.home_team_id, match.away_team_id].sort().join(":")));
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
      const firstLegKey = `${home.id}:${away.id}`;
      const secondLegKey = `${away.id}:${home.id}`;
      if (legs === 1 && !existingPairs.has(key)) {
        fixtures.push({ tournament_id: tournamentId, home_team_id: home.id, away_team_id: away.id, matchday, stage });
        existingPairs.add(key);
        existingDirectedPairs.add(firstLegKey);
      } else if (legs === 2) {
        if (!existingDirectedPairs.has(firstLegKey)) {
          fixtures.push({ tournament_id: tournamentId, home_team_id: home.id, away_team_id: away.id, matchday, stage });
          existingDirectedPairs.add(firstLegKey);
        }
        if (!existingDirectedPairs.has(secondLegKey)) {
          fixtures.push({ tournament_id: tournamentId, home_team_id: away.id, away_team_id: home.id, matchday: matchday + rounds, stage: `${stage} (Vuelta)` });
          existingDirectedPairs.add(secondLegKey);
        }
      }
    }
  });
  return fixtures;
}

export function scheduleFixtures(fixtures: any[], day: string, startTime: string, config: TournamentConfig) {
  const start = new Date(`${day}T${startTime}:00-05:00`);
  return fixtures.map((fixture, index) => {
    const slot = Math.floor(index / config.court_count);
    const interval = config.match_duration_minutes + config.break_between_matches_minutes;
    const date = new Date(start.getTime() + slot * interval * 60000);
    return { ...fixture, court: `Cancha ${(index % config.court_count) + 1}`, match_date: date.toISOString() };
  });
}

const baseStage = (stage: string) => String(stage || "").replace(/\s+\(Vuelta\)$/i, "");

export function validateManualMatch(candidate: any, matches: any[], durationMinutes: number, options: { maxLegs?: number; ignoreMatchId?: string } = {}) {
  const start = new Date(candidate.match_date).getTime();
  const end = start + durationMinutes * 60000;
  const pair = [candidate.home_team_id, candidate.away_team_id].sort().join(":");
  const directedPair = `${candidate.home_team_id}:${candidate.away_team_id}`;
  const candidateBaseStage = baseStage(candidate.stage);
  const maxLegs = Math.max(1, Math.min(2, Number(options.maxLegs || 1)));
  const sameTieMatches = matches.filter((match) => {
    if (options.ignoreMatchId && match.id === options.ignoreMatchId) return false;
    return baseStage(match.stage) === candidateBaseStage && [match.home_team_id, match.away_team_id].sort().join(":") === pair;
  });
  if (sameTieMatches.some(match => `${match.home_team_id}:${match.away_team_id}` === directedPair)) {
    return "Este cruce con la misma localia ya existe en la misma fase.";
  }
  if (sameTieMatches.length >= maxLegs) {
    return maxLegs === 1
      ? "Este cruce ya fue programado o jugado en esta fase."
      : "Este cruce ya tiene ida y vuelta registradas en esta fase.";
  }
  for (const match of matches) {
    if (options.ignoreMatchId && match.id === options.ignoreMatchId) continue;
    if (match.status === "finished") continue;
    const existingPair = [match.home_team_id, match.away_team_id].sort().join(":");
    if (!match.match_date) continue;
    const existingStart = new Date(match.match_date).getTime();
    const existingEnd = existingStart + durationMinutes * 60000;
    const overlaps = start < existingEnd && end > existingStart;
    if (!overlaps) continue;
    if (match.court === candidate.court) return "Ya existe un partido programado en esta fecha, hora y cancha. Seleccione otro horario. La cancha ya esta ocupada.";
    if ([candidate.home_team_id, candidate.away_team_id].includes(match.home_team_id) || [candidate.home_team_id, candidate.away_team_id].includes(match.away_team_id)) {
      return "Uno de los equipos ya tiene un partido en ese horario.";
    }
  }
  return null;
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

export function createGroupSequenceKnockoutFixtures(groups: Record<string, any[]>, tournamentId: string, stage: string, matchday: number, legs: number) {
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  const used = new Set<string>();
  const pairs: any[] = [];

  for (let groupIndex = 0; groupIndex < groupNames.length; groupIndex += 2) {
    const groupA = groups[groupIndex >= groupNames.length ? groupNames[0] : groupNames[groupIndex]];
    const groupB = groups[groupIndex + 1 >= groupNames.length ? groupNames[0] : groupNames[groupIndex + 1]];
    if (!groupA || !groupB || groupA === groupB) continue;
    const qualifiedA = groupA.filter(team => team.classificationStatus === "qualified").sort((a, b) => Number(a.groupRank || 99) - Number(b.groupRank || 99));
    const qualifiedB = groupB.filter(team => team.classificationStatus === "qualified").sort((a, b) => Number(a.groupRank || 99) - Number(b.groupRank || 99));
    const maxRank = Math.max(qualifiedA.length, qualifiedB.length);
    for (let rank = 0; rank < maxRank; rank++) {
      const reverseRank = maxRank - rank - 1;
      const first = qualifiedA[rank];
      const second = qualifiedB[reverseRank];
      if (first && second && !used.has(first.id) && !used.has(second.id)) {
        pairs.push([first, second]);
        used.add(first.id); used.add(second.id);
      }
      const third = qualifiedB[rank];
      const fourth = qualifiedA[reverseRank];
      if (third && fourth && !used.has(third.id) && !used.has(fourth.id)) {
        pairs.push([third, fourth]);
        used.add(third.id); used.add(fourth.id);
      }
    }
  }

  const remaining = Object.values(groups)
    .flat()
    .filter(team => team.classificationStatus === "qualified" && !used.has(team.id))
    .sort(sortStandings);
  while (remaining.length >= 2) pairs.push([remaining.shift(), remaining.pop()]);

  return pairs.flatMap(([home, away]) => {
    const fixture = { tournament_id: tournamentId, home_team_id: home.id, away_team_id: away.id, matchday, stage };
    return legs === 2
      ? [fixture, { tournament_id: tournamentId, home_team_id: away.id, away_team_id: home.id, matchday: matchday + 1, stage: `${stage} (Vuelta)` }]
      : [fixture];
  });
}

export function createDrawKnockoutFixtures(qualified: any[], tournamentId: string, stage: string, matchday: number, legs: number, seed = Date.now()) {
  const shuffled = [...qualified];
  let value = Math.max(1, Number(seed) || 1);
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  const fixtures: any[] = [];
  const used = new Set<string>();
  for (let index = 0; index < shuffled.length - 1; index += 2) {
    const home = shuffled[index];
    const away = shuffled[index + 1];
    if (!home?.id || !away?.id || used.has(home.id) || used.has(away.id)) continue;
    used.add(home.id); used.add(away.id);
    fixtures.push({ tournament_id: tournamentId, home_team_id: home.id, away_team_id: away.id, matchday, stage });
    if (legs === 2) fixtures.push({ tournament_id: tournamentId, home_team_id: away.id, away_team_id: home.id, matchday: matchday + 1, stage: `${stage} (Vuelta)` });
  }
  return fixtures;
}

export function getStageWinners(matches: any[], teams: any[], stage: string) {
  const teamById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const ties: Record<string, { first: string; second: string; firstGoals: number; secondGoals: number; finished: number; total: number; penaltyWinner: string | null }> = {};
  matches.filter((match) => match.stage === stage || match.stage === `${stage} (Vuelta)`).forEach((match) => {
    const pair = [match.home_team_id, match.away_team_id].sort();
    const key = pair.join(":");
    const tie = ties[key] ||= { first: pair[0], second: pair[1], firstGoals: 0, secondGoals: 0, finished: 0, total: 0, penaltyWinner: null };
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
    if (match.resolved_by_penalties && Number(match.home_penalties) !== Number(match.away_penalties)) {
      tie.penaltyWinner = Number(match.home_penalties) > Number(match.away_penalties) ? match.home_team_id : match.away_team_id;
    }
  });
  return Object.values(ties)
    .filter((tie) => tie.finished === tie.total && (tie.firstGoals !== tie.secondGoals || tie.penaltyWinner))
    .map((tie) => teamById[tie.firstGoals === tie.secondGoals ? tie.penaltyWinner! : tie.firstGoals > tie.secondGoals ? tie.first : tie.second])
    .filter(Boolean);
}

export function calculateFinancialBalance(charges: any[], payments: any[]) {
  const totalCharges = charges.reduce((sum, entry) => sum + (entry.entry_type === "adjustment" ? -1 : 1) * Number(entry.amount || 0), 0);
  const totalPayments = payments.reduce((sum, entry) => sum + (entry.entry_type === "reversal" ? -1 : 1) * Number(entry.amount || 0), 0);
  return {
    totalCharges,
    totalPayments,
    balance: Math.max(0, totalCharges - totalPayments),
    status: totalCharges - totalPayments <= 0 ? "paid" : totalPayments > 0 ? "partial" : "overdue",
  };
}
