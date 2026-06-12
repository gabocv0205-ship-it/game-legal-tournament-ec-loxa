"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useTournamentData() {
  const [data, setData] = useState({
    players: [] as any[],
    teams: [] as any[],
    matches: [] as any[],
    stats: { suspended: 0, debts: 0 },
    loading: true,
    tournamentId: null as string | null,
    tournamentName: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const activeId = typeof window !== "undefined" ? localStorage.getItem("activeTournamentId") : null;
      const activeName = typeof window !== "undefined" ? localStorage.getItem("activeTournamentName") : "";

      // Never infer another client's tournament. Indicators only belong to the explicitly selected tournament.
      if (!activeId) {
        setData({ players: [], teams: [], matches: [], stats: { suspended: 0, debts: 0 }, loading: false, tournamentId: null, tournamentName: "" });
        return;
      }

      const [tournamentRes, playersRes, teamsRes, matchesRes] = await Promise.all([
        supabase.from("tournaments").select("name, registration_fee, referee_fee, yellow_card_fee, red_card_fee").eq("id", activeId).single(),
        supabase.from("players").select("*, teams(name, shield_url)").eq("tournament_id", activeId),
        supabase.from("teams").select("*, payments(amount)").eq("tournament_id", activeId),
        supabase.from("matches").select("*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)").eq("tournament_id", activeId),
      ]);

      const players = playersRes.data || [];
      const teams = teamsRes.data || [];
      const matches = matchesRes.data || [];
      const finished = matches.filter((match: any) => match.status === "finished");
      const matchIds = finished.map((match: any) => match.id);
      const eventsRes = matchIds.length
        ? await supabase.from("match_events").select("team_id, event_type").in("match_id", matchIds)
        : { data: [] as any[] };
      const events = eventsRes.data || [];
      const tournament = tournamentRes.data;

      const registration = Number(tournament?.registration_fee || 0);
      const referee = Number(tournament?.referee_fee || 0);
      const yellow = Number(tournament?.yellow_card_fee || 0);
      const red = Number(tournament?.red_card_fee || 0);
      const debts = teams.filter((team: any) => {
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
        stats: { suspended: players.filter((player: any) => player.suspended).length, debts },
        loading: false,
        tournamentId: activeId,
        tournamentName: tournament?.name || activeName || "Torneo Oficial",
      });
    } catch (error) {
      console.error("Error cargando datos del torneo:", error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}
