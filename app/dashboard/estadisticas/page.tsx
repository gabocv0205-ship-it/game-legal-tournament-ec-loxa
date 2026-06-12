"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { calculateStandings, normalizeTournamentConfig } from "@/lib/tournamentEngine";

export default function EstadisticasPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [tabla, setTabla] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [sanciones, setSanciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [llaves, setLlaves] = useState<any[]>([]);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      // 1. AISLAMIENTO SAAS: Identificar el torneo activo
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      
      if (!activeId) {
        const { data: fallback } = await supabase.from('tournaments').select('id').limit(1).single();
        if (fallback) activeId = fallback.id;
      }
      
      if (!activeId) {
        setLoading(false);
        return;
      }
      
      setTorneoId(activeId);
      const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", activeId).single();
      const rules = normalizeTournamentConfig(tournament || {});

      // 2. Obtener Todos los Equipos estrictamente de ESTE torneo
      const { data: teams } = await supabase.from("teams")
        .select("*")
        .eq("tournament_id", activeId);

      // 3. Obtener Partidos Finalizados de ESTE torneo
      const { data: matches } = await supabase.from("matches")
        .select("*, home:home_team_id(id, name, shield_url), away:away_team_id(id, name, shield_url)")
        .eq("tournament_id", activeId)
        .eq("status", "finished");
      const { data: knockoutMatches } = await supabase.from("matches")
        .select("*, home:home_team_id(id, name), away:away_team_id(id, name)")
        .eq("tournament_id", activeId)
        .neq("stage", "Fase de Grupos")
        .order("match_date", { ascending: true });
      setLlaves(knockoutMatches || []);

      // 4. Obtener Eventos (Goles y Tarjetas)
      const matchIds = matches?.map(m => m.id) || [];
      let events: any[] = [];
      if (matchIds.length > 0) {
        const { data: eventsData } = await supabase.from("match_events")
          .select("*, players(id, full_name), teams(name)")
          .in("match_id", matchIds);
        if (eventsData) events = eventsData;
      }

      // ==========================================
      // CÁLCULO DE LA TABLA DE POSICIONES GENERAL
      // ==========================================
      const stats: Record<string, any> = {};
      
      teams?.forEach(t => {
        stats[t.id] = { id: t.id, name: t.name, shield: t.shield_url, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, gd: 0, pts: 0 };
      });

      matches?.forEach(m => {
        const homeId = m.home_team_id;
        const awayId = m.away_team_id;
        const hGoals = m.home_goals || 0;
        const aGoals = m.away_goals || 0;

        if (stats[homeId] && stats[awayId]) {
          stats[homeId].pj++; stats[awayId].pj++;
          stats[homeId].gf += hGoals; stats[awayId].gf += aGoals;
          stats[homeId].gc += aGoals; stats[awayId].gc += hGoals;

          if (hGoals > aGoals) {
            stats[homeId].pg++; stats[homeId].pts += 3;
            stats[awayId].pp++;
          } else if (aGoals > hGoals) {
            stats[awayId].pg++; stats[awayId].pts += 3;
            stats[homeId].pp++;
          } else {
            stats[homeId].pe++; stats[homeId].pts += 1;
            stats[awayId].pe++; stats[awayId].pts += 1;
          }
        }
      });

      const groups = calculateStandings(teams || [], matches || [], events, rules);
      setTabla(Object.values(groups).flat());

      // ==========================================
      // CÁLCULO DE GOLEADORES
      // ==========================================
      const golesObj: Record<string, any> = {};
      events.filter(e => e.event_type === 'gol').forEach(e => {
         const pId = e.player_id;
         if (!golesObj[pId]) {
            golesObj[pId] = { id: pId, name: e.players?.full_name || 'Desconocido', team: e.teams?.name || 'Sin Equipo', goles: 0 };
         }
         golesObj[pId].goles++;
      });
      setGoleadores(Object.values(golesObj).sort((a, b) => b.goles - a.goles).slice(0, 15));

      // ==========================================
      // CÁLCULO DE SANCIONES Y SUSPENSIONES
      // ==========================================
      const sancionesObj: Record<string, any> = {};
      events.filter(e => e.event_type === 'amarilla' || e.event_type === 'roja').forEach(e => {
         const pId = e.player_id;
         if (!sancionesObj[pId]) {
            sancionesObj[pId] = { id: pId, name: e.players?.full_name || 'Desconocido', team: e.teams?.name || 'Sin Equipo', amarillas: 0, rojas: 0 };
         }
         if (e.event_type === 'amarilla') sancionesObj[pId].amarillas++;
         if (e.event_type === 'roja') sancionesObj[pId].rojas++;
      });

      const sancionesArray = Object.values(sancionesObj).map(s => {
         // Regla de suspensión: 1 Roja directa o 3 Amarillas acumuladas
         s.partidosSuspension = s.rojas > 0
           ? s.rojas * rules.red_suspension_matches
           : Math.floor(s.amarillas / rules.yellow_cards_for_suspension) * rules.yellow_suspension_matches;
         s.suspendido = s.partidosSuspension > 0;
         return s;
      }).sort((a, b) => (b.suspendido === a.suspendido ? b.rojas - a.rojas : b.suspendido ? 1 : -1));

      setSanciones(sancionesArray);

    } catch (error) {
      console.error("Error cargando estadísticas", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#D4A017] font-black uppercase tracking-widest text-sm animate-pulse">Calculando Estadísticas Oficiales...</p>
      </div>
    );
  }

  // Filtrar suspendidos para la alerta superior
  const suspendidosActivos = sanciones.filter(s => s.suspendido);

  return (
    <div className="space-y-8">
      
      {/* HEADER Y ALERTAS */}
      <div className="border-b border-[#2E2E2E] pb-4">
        <h2 className="text-3xl font-black text-white uppercase tracking-wider">Centro de Estadísticas</h2>
        <p className="text-gray-400 font-bold text-sm mt-1">Clasificación, Goleadores y Tribunal de Disciplina</p>
      </div>

      {suspendidosActivos.length > 0 && (
        <div className="bg-red-900/20 border border-red-600/50 p-4 rounded-xl flex items-start gap-4 shadow-lg shadow-red-900/20">
          <div className="bg-red-600 p-2 rounded-lg text-xl">⚠️</div>
          <div>
            <h4 className="text-red-500 font-black uppercase tracking-widest text-sm">Alerta Disciplinaria</h4>
            <p className="text-gray-300 text-sm mt-1">Hay <span className="font-bold text-white">{suspendidosActivos.length} jugador(es)</span> suspendidos para la siguiente fecha por acumulación de tarjetas o expulsión directa.</p>
          </div>
        </div>
      )}

      {/* TABLA DE POSICIONES GENERAL */}
      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-2xl">
        <div className="bg-[#141414] border-b border-[#2E2E2E] px-6 py-4">
           <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm flex items-center gap-2">
             <span>🏆</span> Tabla de Posiciones Oficial
           </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm text-white whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
              <tr>
                <th className="px-4 py-3 text-center w-10">POS</th>
                <th className="px-4 py-3 text-left">Club</th>
                <th className="px-3 py-3" title="Partidos Jugados">PJ</th>
                <th className="px-3 py-3 text-green-500/70" title="Partidos Ganados">PG</th>
                <th className="px-3 py-3 text-yellow-500/70" title="Partidos Empatados">PE</th>
                <th className="px-3 py-3 text-red-500/70" title="Partidos Perdidos">PP</th>
                <th className="px-3 py-3" title="Goles a Favor">GF</th>
                <th className="px-3 py-3" title="Goles en Contra">GC</th>
                <th className="px-3 py-3" title="Gol Diferencia">GD</th>
                <th className="px-3 py-3" title="Puntos Fair Play (menos es mejor)">FP</th>
                <th className="px-4 py-3 font-black text-[#D4A017] text-xs">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {tabla.map((s, index) => (
                <tr key={s.id} className={`hover:bg-[#141414] transition-colors border-l-4 ${s.classificationStatus === 'qualified' ? 'border-l-green-500' : s.classificationStatus === 'repechage' ? 'border-l-yellow-500' : 'border-l-gray-600'}`}>
                  <td className="px-4 py-3 font-black text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-left font-bold flex items-center gap-3">
                    {s.shield ? <Image src={s.shield} alt={`Escudo de ${s.name}`} width={24} height={24} unoptimized className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-[#2e2e2e] rounded-full"></div>}
                    <span className="uppercase tracking-wide">{s.name}</span>
                  </td>
                  <td className="px-3 py-3 font-bold">{s.pj}</td>
                  <td className="px-3 py-3 text-green-400">{s.pg}</td>
                  <td className="px-3 py-3 text-yellow-400">{s.pe}</td>
                  <td className="px-3 py-3 text-red-400">{s.pp}</td>
                  <td className="px-3 py-3 text-gray-300">{s.gf}</td>
                  <td className="px-3 py-3 text-gray-300">{s.gc}</td>
                  <td className="px-3 py-3 font-bold text-white">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                  <td className="px-3 py-3 font-bold text-blue-300">{s.fairPlay}</td>
                  <td className="px-4 py-3 font-black text-lg text-[#D4A017] bg-[#D4A017]/5">{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-2xl">
        <div className="bg-[#141414] border-b border-[#2E2E2E] px-6 py-4">
          <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm">Cuadro Eliminatorio Profesional</h3>
          <p className="text-gray-500 text-xs mt-1">Cruces generados según clasificación y formato configurado.</p>
        </div>
        {llaves.length === 0 ? <p className="p-8 text-center text-gray-500">Las llaves aparecerán cuando se genere la fase final.</p> : (
          <div className="p-6 flex gap-6 overflow-x-auto">
            {Array.from(new Set(llaves.map(l => l.stage))).map(stage => (
              <div key={stage} className="min-w-[250px] space-y-3">
                <h4 className="text-xs text-[#D4A017] font-black uppercase tracking-widest">{stage}</h4>
                {llaves.filter(l => l.stage === stage).map(match => (
                  <div key={match.id} className="bg-[#141414] border border-[#2E2E2E] rounded-xl p-3 text-sm text-white">
                    <div className="flex justify-between"><span>{match.home?.name}</span><b>{match.status === 'finished' ? match.home_goals : '-'}</b></div>
                    <div className="border-t border-[#2E2E2E] my-2" />
                    <div className="flex justify-between"><span>{match.away?.name}</span><b>{match.status === 'finished' ? match.away_goals : '-'}</b></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* TABLA DE GOLEADORES */}
        <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-xl h-fit">
          <div className="bg-[#141414] border-b border-[#2E2E2E] px-6 py-4">
             <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
               <span>⚽</span> Máximos Artilleros
             </h3>
          </div>
          <table className="w-full text-left text-sm text-white">
            <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-3">Jugador</th>
                <th className="px-6 py-3 text-center w-20">Goles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {goleadores.length === 0 ? (
                <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-500 italic">Aún no hay goles registrados.</td></tr>
              ) : (
                goleadores.map((g, index) => (
                  <tr key={g.id} className="hover:bg-[#141414]">
                    <td className="px-6 py-3">
                      <p className="font-bold uppercase tracking-wide">{index + 1}. {g.name}</p>
                      <p className="text-[10px] text-[#D4A017] uppercase tracking-wider mt-0.5">{g.team}</p>
                    </td>
                    <td className="px-6 py-3 text-center font-black text-xl text-white bg-white/5">{g.goles}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* TRIBUNAL DE DISCIPLINA */}
        <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-xl h-fit">
          <div className="bg-[#141414] border-b border-[#2E2E2E] px-6 py-4 flex justify-between items-center">
             <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
               <span>⚖️</span> Tribunal Disciplinario
             </h3>
          </div>
          <table className="w-full text-left text-sm text-white">
            <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-4 py-3">Jugador</th>
                <th className="px-2 py-3 text-center" title="Amarillas">🟨</th>
                <th className="px-2 py-3 text-center" title="Rojas">🟥</th>
                <th className="px-4 py-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {sanciones.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">Juego limpio. No hay tarjetas registradas.</td></tr>
              ) : (
                sanciones.map(s => (
                  <tr key={s.id} className={`hover:bg-[#141414] ${s.suspendido ? 'bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-bold uppercase tracking-wide">{s.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{s.team}</p>
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-yellow-500">{s.amarillas > 0 ? s.amarillas : '-'}</td>
                    <td className="px-2 py-3 text-center font-bold text-red-500">{s.rojas > 0 ? s.rojas : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {s.suspendido ? (
                        <span className="inline-block bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded animate-pulse">Suspendido {s.partidosSuspension} partido(s)</span>
                      ) : (
                        <span className="inline-block border border-green-600/50 text-green-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Habilitado</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
 
