"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PartidosPage() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [partidoActivo, setPartidoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  
  const [eventoTipo, setEventoTipo] = useState("gol");
  const [eventoJugador, setEventoJugador] = useState("");
  const [eventoMinuto, setEventoMinuto] = useState("");
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
    if (!tourney) return;

    const { data: teamsData } = await supabase.from("teams").select("id, name").eq("tournament_id", tourney.id).order("name");
    if (teamsData) setEquipos(teamsData);

    const { data: matchesData } = await supabase.from("matches")
      .select("*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)")
      .eq("tournament_id", tourney.id)
      .order("match_date", { ascending: true });
    if (matchesData) setPartidos(matchesData);
  };

  const abrirPartido = async (partido: any) => {
    setPartidoActivo(partido);
    const { data: playersData } = await supabase.from("players")
      .select("id, full_name, team_id, teams(name)")
      .in("team_id", [partido.home_team_id, partido.away_team_id]);
    if (playersData) setJugadores(playersData);
    cargarEventos(partido.id);
  };

  const cargarEventos = async (matchId: string) => {
    const { data } = await supabase.from("match_events")
      .select("*, players(full_name), teams(name)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });
    if (data) setEventos(data);
  };

  const registrarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoJugador) return alert("Selecciona un jugador.");
    
    try {
      const { error } = await supabase.from("match_events").insert([{
        match_id: partidoActivo.id,
        player_id: eventoJugador,
        team_id: jugadores.find(j => j.id === eventoJugador).team_id,
        event_type: eventoTipo,
        minute: eventoMinuto ? parseInt(eventoMinuto) : null
      }]);
      if (error) throw error;
      setEventoJugador(""); setEventoMinuto("");
      cargarEventos(partidoActivo.id);
    } catch (error) { alert("Error al registrar."); }
  };

  const actualizarEvento = async (id: string, nuevoTipo: string, nuevoMinuto: string) => {
    await supabase.from("match_events").update({ event_type: nuevoTipo, minute: parseInt(nuevoMinuto) }).eq("id", id);
    setEditandoEventoId(null);
    cargarEventos(partidoActivo.id);
  };

  const eliminarEvento = async (id: string) => {
    if (!window.confirm("¿Anular este evento?")) return;
    await supabase.from("match_events").delete().eq("id", id);
    cargarEventos(partidoActivo.id);
  };

  if (partidoActivo) {
    return (
      <div className="space-y-6">
        <button onClick={() => setPartidoActivo(null)} className="text-[#D4A017] font-bold">← Volver</button>
        <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E]">
          <h2 className="text-xl font-bold text-white mb-4">{partidoActivo.home.name} vs {partidoActivo.away.name}</h2>
          
          <form onSubmit={registrarEvento} className="flex gap-2 mb-6">
            <select value={eventoJugador} onChange={e => setEventoJugador(e.target.value)} className="bg-[#2E2E2E] p-2 text-white">
              <option value="">Jugador</option>
              {jugadores.map(j => <option key={j.id} value={j.id}>{j.full_name} ({j.teams.name})</option>)}
            </select>
            <select value={eventoTipo} onChange={e => setEventoTipo(e.target.value)} className="bg-[#2E2E2E] p-2 text-white">
              <option value="gol">⚽ Gol</option>
              <option value="amarilla">🟨 Amarilla</option>
              <option value="roja">🟥 Roja</option>
              <option value="mvp">🌟 MVP</option>
            </select>
            <input type="number" value={eventoMinuto} onChange={e => setEventoMinuto(e.target.value)} placeholder="Min" className="bg-[#2E2E2E] p-2 text-white w-16" />
            <button type="submit" className="bg-[#D4A017] px-4 py-2 font-bold rounded">Agregar</button>
          </form>

          <div className="space-y-2">
            {eventos.map(ev => (
              <div key={ev.id} className="flex items-center gap-4 bg-[#2E2E2E] p-3 rounded text-sm">
                {editandoEventoId === ev.id ? (
                  <div className="flex gap-2">
                    <select id={`t-${ev.id}`} defaultValue={ev.event_type} className="bg-black p-1 text-white"><option value="gol">Gol</option><option value="amarilla">Amarilla</option><option value="roja">Roja</option><option value="mvp">MVP</option></select>
                    <input id={`m-${ev.id}`} type="number" defaultValue={ev.minute} className="bg-black p-1 text-white w-12" />
                    <button onClick={() => actualizarEvento(ev.id, (document.getElementById(`t-${ev.id}`) as HTMLSelectElement).value, (document.getElementById(`m-${ev.id}`) as HTMLInputElement).value)} className="text-green-500 font-bold">Guardar</button>
                  </div>
                ) : (
                  <>
                    <span className="w-8">{ev.event_type === 'gol' ? '⚽' : ev.event_type === 'amarilla' ? '🟨' : ev.event_type === 'roja' ? '🟥' : '🌟'}</span>
                    <span className="flex-1 text-white font-bold">{ev.players?.full_name} <span className="text-gray-400 font-normal">({ev.teams?.name})</span></span>
                    <span className="text-gray-400">Min: {ev.minute}</span>
                    <button onClick={() => setEditandoEventoId(ev.id)} className="text-[#D4A017]">Editar</button>
                    <button onClick={() => eliminarEvento(ev.id)} className="text-red-500">Anular</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E]">
        <form onSubmit={programarPartido} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <select value={localId} onChange={e => setLocalId(e.target.value)} className="p-3 text-black"><option value="">Local</option>{equipos.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <select value={visitanteId} onChange={e => setVisitanteId(e.target.value)} className="p-3 text-black"><option value="">Visitante</option>{equipos.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} className="p-3 text-black" />
          <button type="submit" className="bg-[#D4A017] text-black font-bold p-3 rounded">Programar</button>
        </form>
      </div>
      <div className="bg-[#1C1C1C] rounded-2xl p-6">
        {partidos.map(p => (
           <div key={p.id} className="flex justify-between items-center p-4 bg-[#141414] border border-[#2E2E2E] mb-2 rounded">
             <span className="font-bold text-white">{p.home.name} vs {p.away.name}</span>
             <button onClick={() => abrirPartido(p)} className="bg-[#D4A017] px-4 py-1 text-black font-bold rounded">Gestionar Acta</button>
           </div>
        ))}
      </div>
    </div>
  );
}
