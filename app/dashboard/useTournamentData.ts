"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const INSCRIPTION_FEE = 150;

export function useTournamentData() {
  const [data, setData] = useState({
    players: [] as any[],
    teams: [] as any[],
    matches: [] as any[],
    stats: { suspended: 0, debts: 0 },
    loading: true,
    tournamentId: null as string | null,
  });

  const fetchData = useCallback(async () => {
    try {
      const { data: tourney, error: tourneyError } = await supabase
        .from('tournaments')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tourneyError || !tourney) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      const [playersRes, teamsRes, matchesRes] = await Promise.all([
        supabase
          .from('players')
          .select('*, teams(name, shield_url)')
          .eq('tournament_id', tourney.id),
        supabase
          .from('teams')
          .select('*, payments(amount)')
          .eq('tournament_id', tourney.id),
        supabase
          .from('matches')
          .select('*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)')
          .eq('tournament_id', tourney.id),
      ]);

      const playersData = playersRes.data || [];
      const teamsData = teamsRes.data || [];
      const matchesData = matchesRes.data || [];

      setData({
        players: playersData,
        teams: teamsData,
        matches: matchesData,
        stats: {
          suspended: playersData.filter((p: any) => p.suspended).length,
          debts: teamsData.filter((t: any) => {
            const pagado =
              t.payments?.reduce(
                (acc: number, val: any) => acc + Number(val.amount || 0),
                0
              ) || 0;
            return INSCRIPTION_FEE - pagado > 0;
          }).length,
        },
        loading: false,
        tournamentId: tourney.id,
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refetch: fetchData };
}
