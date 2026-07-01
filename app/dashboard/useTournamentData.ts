"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getSuspendedPlayerIdsForMatch, normalizeTournamentConfig } from "@/lib/tournamentEngine";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";

export function useTournamentData() {
  const [data, setData] = useState({
    players: [] as any[],
    teams: [] as any[],
    matches: [] as any[],
    stats: { suspended: 0, debts: 0, nextMatchday: null as number | null },
    disciplinaryAlerts: { suspended: [] as any[], eligibleAgain: [] as any[] },
    loading: true,
    tournamentId: null as string | null,
    tournamentName: "",
    tournamentPosterUrl: "",
    tournamentBannerUrl: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const activeId = typeof window !== "undefined" ? localStorage.getItem("activeTournamentId") : null;
      const activeName = typeof window !== "undefined" ? localStorage.getItem("activeTournamentName") : "";

      // Never infer another client's tournament. Indicators only belong to the explicitly selected tournament.
      if (!activeId) {
        setData({ players: [], teams: [], matches: [], stats: { suspended: 0, debts: 0, nextMatchday: null }, disciplinaryAlerts: { suspended: [], eligibleAgain: [] }, loading: false, tournamentId: null, tournamentName: "", tournamentPosterUrl: "", tournamentBannerUrl: "" });
        return;
      }

      const tournament = await getAccessibleTournament(supabase, activeId);
      if (!tournament) {
        clearActiveTournament();
        setData({ players: [], teams: [], matches: [], stats: { suspended: 0, debts: 0, nextMatchday: null }, disciplinaryAlerts: { suspended: [], eligibleAgain: [] }, loading: false, tournamentId: null, tournamentName: "", tournamentPosterUrl: "", tournamentBannerUrl: "" });
        return;
      }

      const [playersRes, teamsRes, matchesRes, ledgerRes] = await Promise.all([
        supabase.from("players").select("*, teams(name, shield_url)").eq("tournament_id", activeId),
        supabase.from("teams").select("*, payments(amount)").eq("tournament_id", activeId),
        supabase.from("matches").select("*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)").eq("tournament_id", activeId),
        supabase.from("financial_ledger").select("team_id, entry_type, amount").eq("tournament_id", activeId),
      ]);

      const players = playersRes.data || [];
      const teams = teamsRes.data || [];
      const matches = matchesRes.data || [];
      const finished = matches.filter((match: any) => match.status === "finished");
      const matchIds = finished.map((match: any) => match.id);
      const eventsRes = matchIds.length
        ? await supabase.from("match_events").select("match_id, player_id, team_id, event_type").in("match_id", matchIds)
        : { data: [] as any[] };
      const events = eventsRes.data || [];
      const rules = normalizeTournamentConfig(tournament || {});
      const upcoming = matches
        .filter((match: any) => match.status !== "finished" && match.match_date)
        .sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
      const nextMatchday = upcoming.length ? Number(upcoming[0].matchday || 0) : null;
      const nextMatches = nextMatchday === null ? [] : upcoming.filter((match: any) => Number(match.matchday || 0) === nextMatchday);
      const suspendedIds = new Set<string>();
      const eligibleAgainIds = new Set<string>();
      nextMatches.forEach((nextMatch: any) => {
        const currentSuspended = getSuspendedPlayerIdsForMatch(events, matches, rules, nextMatch);
        currentSuspended.forEach(id => suspendedIds.add(id));
        [nextMatch.home_team_id, nextMatch.away_team_id].forEach((teamId: string) => {
          const previous = matches
            .filter((match: any) => match.status === "finished" && (match.home_team_id === teamId || match.away_team_id === teamId) && new Date(match.match_date).getTime() < new Date(nextMatch.match_date).getTime())
            .sort((a: any, b: any) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())[0];
          if (!previous) return;
          const previouslySuspended = getSuspendedPlayerIdsForMatch(events, matches, rules, previous);
          previouslySuspended.forEach(id => {
            if (!currentSuspended.has(id)) eligibleAgainIds.add(id);
          });
        });
      });
      const playerAlert = (player: any) => ({ id: player.id, name: player.full_name, team: player.teams?.name || "Equipo" });
      const suspendedAlerts = players.filter((player: any) => suspendedIds.has(player.id)).map(playerAlert);
      const eligibleAgainAlerts = players.filter((player: any) => eligibleAgainIds.has(player.id)).map(playerAlert);

      const registration = Number(tournament?.registration_fee || 0);
      const referee = Number(tournament?.referee_fee || 0);
      const yellow = Number(tournament?.yellow_card_fee || 0);
      const red = Number(tournament?.red_card_fee || 0);
      const debts = teams.filter((team: any) => {
        const ledger = ledgerRes.data?.filter((entry: any) => entry.team_id === team.id) || [];
        if (ledger.length) {
          const charges = ledger
            .filter((entry: any) => ["charge", "adjustment"].includes(entry.entry_type))
            .reduce((sum: number, entry: any) => sum + (entry.entry_type === "adjustment" ? -1 : 1) * Number(entry.amount || 0), 0);
          const paid = ledger
            .filter((entry: any) => ["payment", "reversal"].includes(entry.entry_type))
            .reduce((sum: number, entry: any) => sum + (entry.entry_type === "reversal" ? -1 : 1) * Number(entry.amount || 0), 0);
          return charges - paid > 0;
        }
        const paid = team.payments?.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0) || 0;
        const played = finished.filter((match: any) => match.home_team_id === team.id || match.away_team_id === team.id).length;
        const yellows = events.filter((event: any) => event.team_id === team.id && event.event_type === "amarilla").length;
        const reds = events.filter((event: any) => event.team_id === team.id && event.event_type === "roja").length;
        return registration + played * referee + yellows * yellow + reds * red - paid > 0;
      }).length;

      setData({
        players,
        teams,
        matches,
        stats: { suspended: suspendedAlerts.length, debts, nextMatchday },
        disciplinaryAlerts: { suspended: suspendedAlerts, eligibleAgain: eligibleAgainAlerts },
        loading: false,
        tournamentId: activeId,
        tournamentName: tournament?.name || activeName || "Torneo Oficial",
        tournamentPosterUrl: tournament?.poster_url || "",
        tournamentBannerUrl: tournament?.banner_url || "",
      });
    } catch (error) {
      console.error("Error cargando datos del torneo:", error);
      setData({ players: [], teams: [], matches: [], stats: { suspended: 0, debts: 0, nextMatchday: null }, disciplinaryAlerts: { suspended: [], eligibleAgain: [] }, loading: false, tournamentId: null, tournamentName: "", tournamentPosterUrl: "", tournamentBannerUrl: "" });
    }
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener("tournamentChanged", fetchData);
    return () => window.removeEventListener("tournamentChanged", fetchData);
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}
