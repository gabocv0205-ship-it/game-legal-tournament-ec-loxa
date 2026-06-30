import { describe, expect, it } from "vitest";
import {
  calculateFinancialBalance,
  calculateStandings,
  createKnockoutFixtures,
  createMatchdayFixtures,
  getStageWinners,
  normalizeTournamentConfig,
  scheduleFixtures,
  validateManualMatch,
} from "./tournamentEngine";

const teams = [
  { id: "a", name: "A", group_name: "A" },
  { id: "b", name: "B", group_name: "A" },
  { id: "c", name: "C", group_name: "A" },
  { id: "d", name: "D", group_name: "A" },
];

const groupedTeams = [
  { id: "a1", name: "A1", group_name: "A" },
  { id: "a2", name: "A2", group_name: "A" },
  { id: "b1", name: "B1", group_name: "B" },
  { id: "b2", name: "B2", group_name: "B" },
];

describe("motor deportivo", () => {
  it("ordena posiciones y marca clasificados", () => {
    const groups = calculateStandings(teams, [
      { status: "finished", home_team_id: "a", away_team_id: "b", home_goals: 2, away_goals: 0 },
      { status: "finished", home_team_id: "c", away_team_id: "d", home_goals: 1, away_goals: 1 },
    ], [], { qualifiers_per_group: 2 });
    expect(groups.A[0].id).toBe("a");
    expect(groups.A[0].classificationStatus).toBe("qualified");
    expect(groups.A[2].classificationStatus).toBe("eliminated");
  });

  it("genera una jornada sin cruces duplicados", () => {
    const fixtures = createMatchdayFixtures(teams, [], "t1", 1, "Fase de Grupos");
    expect(fixtures).toHaveLength(2);
    expect(new Set(fixtures.map(match => [match.home_team_id, match.away_team_id].sort().join(":"))).size).toBe(2);
  });

  it("mantiene posiciones aisladas por grupo e ignora cruces inválidos entre grupos", () => {
    const groups = calculateStandings(groupedTeams, [
      { id: "m1", status: "finished", stage: "Fase de Grupos", home_team_id: "a1", away_team_id: "a2", home_goals: 2, away_goals: 0 },
      { id: "m2", status: "finished", stage: "Fase de Grupos", home_team_id: "a1", away_team_id: "b1", home_goals: 9, away_goals: 0 },
    ], [{ match_id: "m2", team_id: "a1", event_type: "amarilla" }], { qualifiers_per_group: 1 });
    expect(Object.keys(groups).sort()).toEqual(["A", "B"]);
    expect(groups.A.find(team => team.id === "a1").pts).toBe(3);
    expect(groups.A.find(team => team.id === "a1").gf).toBe(2);
    expect(groups.A.find(team => team.id === "a1").fairPlay).toBe(0);
    expect(groups.B.find(team => team.id === "b1").pj).toBe(0);
  });

  it("genera fixtures solo dentro de cada grupo y soporta ida y vuelta", () => {
    const fixtures = createMatchdayFixtures(groupedTeams, [], "t1", 1, "Fase de Grupos", { legs: 2 });
    expect(fixtures).toHaveLength(4);
    expect(fixtures.every(match => {
      const home = groupedTeams.find(team => team.id === match.home_team_id);
      const away = groupedTeams.find(team => team.id === match.away_team_id);
      return home?.group_name === away?.group_name;
    })).toBe(true);
    expect(fixtures.filter(match => [match.home_team_id, match.away_team_id].sort().join(":") === "a1:a2")).toHaveLength(2);
  });

  it("distribuye horarios entre canchas", () => {
    const config = normalizeTournamentConfig({ court_count: 2, match_duration_minutes: 60, break_between_matches_minutes: 10 });
    const scheduled = scheduleFixtures([{ id: 1 }, { id: 2 }, { id: 3 }], "2026-07-01", "09:00", config);
    expect(scheduled[0].court).toBe("Cancha 1");
    expect(scheduled[1].court).toBe("Cancha 2");
    expect(new Date(scheduled[2].match_date).getTime() - new Date(scheduled[0].match_date).getTime()).toBe(70 * 60 * 1000);
  });

  it("bloquea conflictos de cancha y equipo", () => {
    const matches = [{ home_team_id: "a", away_team_id: "b", court: "Cancha 1", match_date: "2026-07-01T09:00:00.000Z", status: "scheduled", stage: "Fase de Grupos" }];
    expect(validateManualMatch({ home_team_id: "c", away_team_id: "d", court: "Cancha 1", match_date: "2026-07-01T09:20:00.000Z", stage: "Fase de Grupos" }, matches, 60)).toContain("ocupada");
    expect(validateManualMatch({ home_team_id: "a", away_team_id: "c", court: "Cancha 2", match_date: "2026-07-01T09:20:00.000Z", stage: "Fase de Grupos" }, matches, 60)).toContain("equipo");
  });

  it("no permite repetir manualmente un cruce ya jugado", () => {
    const matches = [{ id: "m1", home_team_id: "a", away_team_id: "b", court: "Cancha 1", match_date: "2026-07-01T09:00:00.000Z", status: "finished", stage: "Fase de Grupos" }];
    const conflict = validateManualMatch({ home_team_id: "b", away_team_id: "a", court: "Cancha 2", match_date: "2026-07-08T09:00:00.000Z", stage: "Fase de Grupos" }, matches, 60);
    expect(conflict).toContain("programado o jugado");
  });

  it("permite vuelta invertida y bloquea tercer cruce cuando hay ida y vuelta", () => {
    const ida = [{ id: "m1", home_team_id: "a", away_team_id: "b", court: "Cancha 1", match_date: "2026-07-01T09:00:00.000Z", status: "finished", stage: "Fase de Grupos" }];
    expect(validateManualMatch({ home_team_id: "b", away_team_id: "a", court: "Cancha 2", match_date: "2026-07-08T09:00:00.000Z", stage: "Fase de Grupos (Vuelta)" }, ida, 60, { maxLegs: 2 })).toBeNull();
    const idaYVuelta = [...ida, { id: "m2", home_team_id: "b", away_team_id: "a", court: "Cancha 2", match_date: "2026-07-08T09:00:00.000Z", status: "finished", stage: "Fase de Grupos (Vuelta)" }];
    expect(validateManualMatch({ home_team_id: "a", away_team_id: "b", court: "Cancha 3", match_date: "2026-07-15T09:00:00.000Z", stage: "Fase de Grupos" }, idaYVuelta, 60, { maxLegs: 2 })).toContain("misma localia");
    expect(validateManualMatch({ home_team_id: "b", away_team_id: "a", court: "Cancha 3", match_date: "2026-07-15T09:00:00.000Z", stage: "Fase de Grupos (Vuelta)" }, idaYVuelta, 60, { maxLegs: 2 })).toContain("misma localia");
  });

  it("genera cruces eliminatorios mejor contra peor", () => {
    const fixtures = createKnockoutFixtures(teams, "t1", "Semifinal", 5, 1);
    expect(fixtures).toHaveLength(2);
    expect(fixtures[0]).toMatchObject({ home_team_id: "a", away_team_id: "d", stage: "Semifinal" });
  });

  it("avanza al ganador de una llave empatada resuelta por penales", () => {
    const winners = getStageWinners([{
      stage: "Final", status: "finished", home_team_id: "a", away_team_id: "b",
      home_goals: 1, away_goals: 1, resolved_by_penalties: true, home_penalties: 5, away_penalties: 4,
    }], teams, "Final");
    expect(winners.map(team => team.id)).toEqual(["a"]);
  });
});

describe("motor financiero", () => {
  it("calcula estado pagado, parcial y vencido", () => {
    expect(calculateFinancialBalance([{ amount: 100 }], []).status).toBe("overdue");
    expect(calculateFinancialBalance([{ amount: 100 }], [{ amount: 40 }]).status).toBe("partial");
    expect(calculateFinancialBalance([{ amount: 100 }], [{ amount: 100 }]).status).toBe("paid");
  });

  it("mantiene trazabilidad y descuenta reversos", () => {
    const balance = calculateFinancialBalance([{ amount: 100 }], [{ amount: 100, entry_type: "payment" }, { amount: 100, entry_type: "reversal" }]);
    expect(balance.totalPayments).toBe(0);
    expect(balance.balance).toBe(100);
  });

  it("aplica ajustes sin borrar el cargo original", () => {
    const balance = calculateFinancialBalance([{ amount: 100, entry_type: "charge" }, { amount: 20, entry_type: "adjustment" }], [{ amount: 80, entry_type: "payment" }]);
    expect(balance.totalCharges).toBe(80);
    expect(balance.status).toBe("paid");
  });
});
