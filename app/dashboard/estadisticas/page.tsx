"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { calculateStandings, normalizeTournamentConfig } from "@/lib/tournamentEngine";
import html2canvas from "html2canvas";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";

export default function EstadisticasPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [tabla, setTabla] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [sanciones, setSanciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [llaves, setLlaves] = useState<any[]>([]);
  const [exportando, setExportando] = useState(false);
  const [nombreTorneo, setNombreTorneo] = useState("Torneo Oficial");
  const [fondoPosterUrl, setFondoPosterUrl] = useState("");
  const [anioTorneo, setAnioTorneo] = useState(new Date().getFullYear());
  const posterPosicionesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      // 1. AISLAMIENTO SAAS: Identificar el torneo activo
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      
      if (!activeId) {
        setLoading(false);
        return;
      }

      const tournament = await getAccessibleTournament(supabase, activeId);
      if (!tournament) {
        clearActiveTournament();
        setTorneoId(null);
        setTabla([]);
        setGoleadores([]);
        setSanciones([]);
        setLlaves([]);
        setLoading(false);
        return;
      }
      
      setTorneoId(activeId);
      const rules = normalizeTournamentConfig(tournament || {});
      setNombreTorneo(tournament?.name || "Torneo Oficial");
      setFondoPosterUrl(tournament?.match_poster_background_url || "");
      setAnioTorneo(rules.tournament_year);

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
        .select("*, home:home_team_id(id, name, shield_url), away:away_team_id(id, name, shield_url)")
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

      const groupMatches = (matches || []).filter(match => match.stage === "Fase de Grupos");
      const groupMatchIds = new Set(groupMatches.map(match => match.id));
      const groupEvents = events.filter(event => groupMatchIds.has(event.match_id));
      const groups = calculateStandings(teams || [], groupMatches, groupEvents, rules);
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
  const posicionesPorGrupo = tabla.reduce<Record<string, any[]>>((groups, team) => {
    (groups[team.group || "General"] ||= []).push(team);
    return groups;
  }, {});

  const descargarPosiciones = async () => {
    if (!posterPosicionesRef.current) return;
    setExportando(true);
    try {
      const ancho = posterPosicionesRef.current.scrollWidth;
      const canvas = await html2canvas(posterPosicionesRef.current, { backgroundColor: "#06132f", scale: 2, useCORS: true, width: ancho, windowWidth: ancho });
      const socialCanvas = document.createElement("canvas");
      socialCanvas.width = 1080; socialCanvas.height = 1350;
      const context = socialCanvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar el póster");
      context.fillStyle = "#06132f"; context.fillRect(0, 0, 1080, 1350);
      const scale = Math.min(1040 / canvas.width, 1310 / canvas.height);
      const width = canvas.width * scale; const height = canvas.height * scale;
      context.drawImage(canvas, (1080 - width) / 2, (1350 - height) / 2, width, height);
      const link = document.createElement("a");
      link.href = socialCanvas.toDataURL("image/png");
      link.download = `Posiciones-${nombreTorneo}-${anioTorneo}.png`;
      link.click();
    } catch {
      alert("No se pudo generar el póster de posiciones.");
    } finally {
      setExportando(false);
    }
  };

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
           <button onClick={descargarPosiciones} disabled={exportando || tabla.length === 0} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 disabled:opacity-50">
             {exportando ? "Generando..." : "Descargar póster de posiciones"}
           </button>
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

      <div ref={posterPosicionesRef} className="relative overflow-hidden rounded-2xl border border-[#D4A017]/40 p-7 bg-[#06132f]" style={fondoPosterUrl ? { backgroundImage: `linear-gradient(150deg, rgba(3,12,35,.9), rgba(8,39,84,.84), rgba(3,12,35,.95)), url("${fondoPosterUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundImage: "radial-gradient(circle at 50% 18%, rgba(28,122,218,.42), transparent 32%), linear-gradient(150deg, #020817, #0a3068 48%, #020817)" }}>
        <div className="absolute inset-4 rounded-xl border border-[#D4A017]/20 pointer-events-none" />
        <div className="relative text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl border-2 border-[#D4A017] bg-gradient-to-br from-[#173e72] to-[#07122d] text-[#E7C36B] flex items-center justify-center font-black shadow-[0_0_25px_rgba(59,130,246,.45)]">G·L</div>
          <h3 className="text-2xl text-white font-black uppercase tracking-widest mt-3">{nombreTorneo}</h3>
          <p className="text-[#E7C36B] font-black uppercase tracking-[0.28em] text-xs mt-1">Tabla de posiciones · {anioTorneo}</p>
          <div className="mt-4 mx-auto h-px max-w-2xl bg-gradient-to-r from-transparent via-[#D4A017] to-transparent" />
        </div>
        <div className={`relative grid gap-4 ${Object.keys(posicionesPorGrupo).length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
          {Object.entries(posicionesPorGrupo).map(([grupo, equipos]) => (
            <div key={grupo} className="overflow-hidden rounded-xl border border-[#D4A017]/45 bg-[#06142d]/95 shadow-[0_12px_30px_rgba(0,0,0,.35)]">
              <div className="bg-gradient-to-r from-[#07152f] via-[#173d70] to-[#07152f] border-b border-[#D4A017]/45 px-3 py-2 flex justify-between">
                <span className="text-[#E7C36B] text-xs font-black uppercase tracking-widest">Grupo {grupo}</span>
                <span className="text-blue-200/70 text-[8px] font-bold uppercase">PJ · GD · PTS</span>
              </div>
              <div className="p-2">
                {equipos.map((team, index) => (
                  <div key={team.id} className={`grid grid-cols-[18px_24px_1fr_24px_28px_30px] items-center gap-1 border-b border-white/10 py-2 last:border-0 border-l-2 ${team.classificationStatus === "qualified" ? "border-l-green-400" : team.classificationStatus === "repechage" ? "border-l-yellow-400" : "border-l-gray-600"}`}>
                    <span className="text-[9px] font-black text-blue-200 text-center">{index + 1}</span>
                    {team.shield ? <Image src={team.shield} alt="" width={20} height={20} unoptimized crossOrigin="anonymous" className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 rounded-full bg-white/10" />}
                    <span className="truncate text-[9px] text-white font-black uppercase">{team.name}</span>
                    <span className="text-[9px] text-blue-100 text-center">{team.pj}</span>
                    <span className="text-[9px] text-blue-100 text-center">{team.gd > 0 ? `+${team.gd}` : team.gd}</span>
                    <span className="text-xs text-[#E7C36B] font-black text-center">{team.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="relative mt-6 pt-4 border-t border-[#D4A017]/30 flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
          <span className="text-green-400">Verde · Clasificado</span>
          <span className="text-yellow-400">Amarillo · Repechaje</span>
          <span className="text-gray-400">Gris · Eliminado</span>
          <span className="text-[#E7C36B]">GAME LEGAL</span>
        </div>
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-2xl">
        <div className="bg-[#141414] border-b border-[#2E2E2E] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
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
                    <div className="flex justify-between items-center"><span className="flex items-center gap-2">{match.home?.shield_url && <Image src={match.home.shield_url} alt="" width={20} height={20} unoptimized />}{match.home?.name}</span><b>{match.status === 'finished' ? match.home_goals : '-'}</b></div>
                    <div className="border-t border-[#2E2E2E] my-2" />
                    <div className="flex justify-between items-center"><span className="flex items-center gap-2">{match.away?.shield_url && <Image src={match.away.shield_url} alt="" width={20} height={20} unoptimized />}{match.away?.name}</span><b>{match.status === 'finished' ? match.away_goals : '-'}</b></div>
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
 
