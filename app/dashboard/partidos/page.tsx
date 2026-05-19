"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PartidosPage() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentStatus, setTournamentStatus] = useState("active");

  const [fecha, setFecha] = useState("");
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const { data: tourney } = await supabase.from("tournaments").select("id, status").order("created_at", { ascending: false }).limit(1).single();
    if (tourney) {
      setTournamentId(tourney.id);
      setTournamentStatus(tourney.status);

      const { data: teams } = await supabase.from("teams").select("*").eq("tournament_id", tourney.id);
      if (teams) setEquipos(teams);

      const { data: matches } = await supabase
        .from("matches")
        .select(`*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)`)
        .eq("tournament_id", tourney.id)
        .order("match_date", { ascending: true });
      if (matches) setPartidos(matches);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCrearPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (local === visitante) { alert("Un equipo no puede jugar contra sí mismo."); return; }
    setLoading(true);

    try {
      await supabase.from("matches").insert([{
        tournament_id: tournamentId,
        home_team_id: local,
        away_team_id: visitante,
        match_date: fecha,
        status: 'pending'
      }]);
      setFecha(""); setLocal(""); setVisitante("");
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const anotarGol = async (id: string, equipo: 'home' | 'away', golesActuales: number) => {
    if (tournamentStatus === "finished") { alert("Torneo finalizado."); return; }
    const campo = equipo === 'home' ? 'home_goals' : 'away_goals';
    await supabase.from("matches").update({ [campo]: golesActuales + 1, status: 'finished' }).eq("id", id);
    loadData();
  };

  const borrarPartido = async (id: string) => {
    if(confirm("¿Eliminar partido?")) {
      await supabase.from("matches").delete().eq("id", id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-gray-900">Calendario Oficial</h2>
        <p className="text-gray-500">Programa partidos y actualiza los marcadores en tiempo real para el portal público.</p>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#D4A017]/30 bg-gradient-to-br from-white to-[#D4A017]/5">
        <form onSubmit={handleCrearPartido} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-600 uppercase">Fecha y Hora</label>
            <input type="datetime-local" value={fecha} onChange={e=>setFecha(e.target.value)} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#D4A017] bg-white" required disabled={tournamentStatus === "finished"}/>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-600 uppercase">Local</label>
            <select value={local} onChange={e=>setLocal(e.target.value)} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#D4A017] bg-white" required disabled={tournamentStatus === "finished"}>
              <option value="">Equipo Local...</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div className="font-black text-gray-300 pb-3">VS</div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-600 uppercase">Visitante</label>
            <select value={visitante} onChange={e=>setVisitante(e.target.value)} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#D4A017] bg-white" required disabled={tournamentStatus === "finished"}>
              <option value="">Equipo Visitante...</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading || tournamentStatus === "finished"} className="px-6 py-2.5 bg-[#141414] hover:bg-black text-[#D4A017] font-bold rounded-xl disabled:opacity-50 transition-all h-[46px]">
            {loading ? "..." : "Programar"}
          </button>
        </form>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
        {partidos.length === 0 ? (
          <p className="text-gray-400 p-8 border border-dashed rounded-2xl text-center w-full col-span-2">No hay partidos programados. Utiliza el panel superior.</p>
        ) : (
          partidos.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative group">
              {tournamentStatus !== "finished" && (
                <button onClick={() => borrarPartido(p.id)} className="absolute top-3 right-3 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
              )}
              
              <span className="text-xs font-bold text-gray-400 block mb-4 uppercase tracking-widest border-b pb-2">
                {new Date(p.match_date).toLocaleString('es-EC', { dateStyle: 'full', timeStyle: 'short' })}
              </span>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-3xl mb-1">{p.home?.shield_url || '⚽'}</div>
                  <p className="font-black text-gray-900 text-lg leading-tight">{p.home?.name}</p>
                  <button onClick={()=>anotarGol(p.id, 'home', p.home_goals)} className="mt-3 text-xs bg-gray-100 text-gray-700 hover:bg-[#D4A017] hover:text-white px-4 py-1.5 rounded-full font-bold transition-colors shadow-sm">
                    + Gol Local
                  </button>
                </div>
                
                <div className="bg-[#141414] text-white font-black text-3xl px-6 py-3 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] min-w-[100px] border border-[#2E2E2E]">
                  {p.home_goals} - {p.away_goals}
                </div>
                
                <div className="flex-1 flex flex-col items-center">
                  <div className="text-3xl mb-1">{p.away?.shield_url || '⚽'}</div>
                  <p className="font-black text-gray-900 text-lg leading-tight">{p.away?.name}</p>
                  <button onClick={()=>anotarGol(p.id, 'away', p.away_goals)} className="mt-3 text-xs bg-gray-100 text-gray-700 hover:bg-[#D4A017] hover:text-white px-4 py-1.5 rounded-full font-bold transition-colors shadow-sm">
                    + Gol Visita
                  </button>
                </div>
              </div>
              
              {p.status === 'finished' && (
                <div className="mt-5 text-xs font-bold text-green-700 bg-green-50 py-1.5 rounded-lg border border-green-100">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Resultado en Vivo en el Portal
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
