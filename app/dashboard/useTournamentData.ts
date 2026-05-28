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
    tournamentName: "" as string,
  });

  const fetchData = useCallback(async () => {
    try {
      // 1. LEER LA IDENTIDAD DEL TORNEO DESDE LA MEMORIA DEL NAVEGADOR
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      let activeName = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentName') : "";

      // 2. RESPALDO AUTOMÁTICO: Si no hay ninguno en memoria, buscamos el más reciente
      if (!activeId) {
        const { data: fallbackTourney, error: tourneyError } = await supabase
          .from('tournaments')
          .select('id, name')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tourneyError || !fallbackTourney) {
          setData(prev => ({ ...prev, loading: false }));
          return;
        }
        
        activeId = fallbackTourney.id;
        activeName = fallbackTourney.name;
        
        // Guardar el respaldo en memoria de forma segura para TypeScript
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeTournamentId', activeId || "");
          localStorage.setItem('activeTournamentName', activeName || "Torneo Oficial");
        }
      }

      // 3. EXTRAER DATOS FILTRADOS EXCLUSIVAMENTE PARA ESTE TORNEO (Aislamiento SaaS)
      const [playersRes, teamsRes, matchesRes] = await Promise.all([
        supabase
          .from('players')
          .select('*, teams(name, shield_url)')
          .eq('tournament_id', activeId),
        supabase
          .from('teams')
          .select('*, payments(amount)')
          .eq('tournament_id', activeId),
        supabase
          .from('matches')
          .select('*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)')
          .eq('tournament_id', activeId),
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
        tournamentId: activeId,
        tournamentName: activeName || "Torneo Oficial",
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
