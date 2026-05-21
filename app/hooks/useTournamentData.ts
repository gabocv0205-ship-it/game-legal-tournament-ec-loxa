import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useTournamentData() {
  const [data, setData] = useState({
    players: [],
    teams: [],
    matches: [],
    stats: { suspended: 0, debts: 0 },
    loading: true,
    tournamentId: null
  });

  const fetchData = async () => {
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (!tourney) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      const [playersRes, teamsRes, matchesRes] = await Promise.all([
        supabase.from('players').select('*, teams(name, shield_url)').eq('tournament_id', tourney.id),
        supabase.from('teams').select('*, payments(amount)').eq('tournament_id', tourney.id),
        supabase.from('matches').select('*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)').eq('tournament_id', tourney.id)
      ]);

      setData({
        players: playersRes.data || [],
        teams: teamsRes.data || [],
        matches: matchesRes.data || [],
        stats: {
          suspended: (playersRes.data || []).filter((p: any) => p.suspended).length,
          debts: (teamsRes.data || []).filter((t: any) => {
             const pagado = t.payments?.reduce((acc: number, val: any) => acc + Number(val.amount), 0) || 0;
             return (150 - pagado) > 0; // Asumiendo $150 de inscripción
          }).length
        },
        loading: false,
        tournamentId: tourney.id as any
      });
    } catch (error) {
      console.error("Error cargando datos:", error);
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => { fetchData(); }, []);

  return { ...data, refetch: fetchData };
}
