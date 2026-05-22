"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PartidosPage() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para nuevo partido
  const [localId, setLocalId] = useState("");
  const [visitanteId, setVisitanteId] = useState("");
  const [fecha, setFecha] = useState("");

  // Estados para la Vista de "Partido en Vivo"
  const [partidoActivo, setPartidoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  
  // Estados para nuevo evento
  const [eventoTipo, setEventoTipo] = useState("gol");
  const [eventoJugador, setEventoJugador] = useState("");
  const [eventoMinuto, setEventoMinuto] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
    if (!tourney) return;

    // Cargar Equipos
    const { data: teamsData } = await supabase.from("teams").select("id, name").eq("tournament_id", tourney.id).order("name");
    if (teamsData) setEquipos(teamsData);

    // Cargar Partidos
    const { data: matchesData } = await supabase.from("matches")
      .select("*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)")
      .eq("tournament_id", tourney.id)
      .order("match_date", { ascending: true });
    if (matchesData) setPartidos(matchesData);
  };

  const programarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localId === visitanteId) return alert("Un equipo no puede jugar contra sí mismo.");
    setLoading(true);
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      const { error } = await supabase.from("matches").insert([{
        tournament_id: tourney.id,
        home_team_id: localId,
        away_team_id: visitanteId,
        match_date: fecha,
        status: "scheduled"
      }]);
      if (error) throw error;
      setLocalId(""); setVisitanteId(""); setFecha("");
      cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  // --- LÓGICA DE PARTIDO EN VIVO ---
  const abrirPartido = async (partido: any) => {
    setPartidoActivo(partido);
    // Cargar solo los jugadores de los dos equipos que se enfrentan
    const { data: playersData } = await supabase.from("players")
      .select("id, name, team_id, teams(name)")
      .in("team_id", [partido.home_team_id, partido.away_team_id])
      .order("name");
    if (playersData) setJugadores(playersData);
    cargarEventos(partido.id);
  };

  const cargarEventos = async (matchId: string) => {
    const { data } = await supabase.from("match_events")
      .select("*, players(name), teams(name)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false });
    if (data) setEventos(data);
  };

  const registrarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoJugador) return alert("Selecciona un jugador.");
    
    const jugadorSel = jugadores.find(j => j.id === eventoJugador);
    try {
      const { error } = await supabase.from("match_events").insert([{
        match_id: partidoActivo.id,
        player_id: jugadorSel.id,
        team_id: jugadorSel.team_id,
        event_type: eventoTipo,
        minute: eventoMinuto ? parseInt(eventoMinuto) : null
      }]);
      if (error) throw error;
      
      setEventoJugador(""); setEventoMinuto(""); setEventoTipo("gol");
      cargarEventos(partidoActivo.id);
    } catch (error: any) { alert("Error al registrar evento."); }
  };

  const eliminarEvento = async (id: string) => {
    if (!window.confirm("¿Borrar este evento?")) return;
    await supabase.from("match_events").delete().eq("id", id);
    cargarEventos(partidoActivo.id);
  };

  const finalizarPartido = async () => {
    if (!window.confirm("¿Seguro que deseas finalizar el partido? Esto calculará el resultado final.")) return;
    setLoading(true);
    
    // Contar goles automáticamente desde los eventos
    const golesLocal = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.home_team_id).length;
    const golesVisitante = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.away_team_id).length;

    try {
      await supabase.from("matches").update({
        status: "finished",
        home_goals: golesLocal,
        away_goals: golesVisitante
      }).eq("id", partidoActivo.id);
      
      setPartidoActivo(null);
      cargarDatos();
    } catch (error) { alert("Error al finalizar."); } finally { setLoading(false); }
  };

  // ============================================================================
  // VISTA 2: PANEL DE CONTROL EN VIVO
  // ============================================================================
  if (partidoActivo) {
    const golesLocal = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.home_team_id).length;
    const golesVisitante = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.away_team_id).length;

    return (
      <div className="space-y-6">
        <button onClick={() => setPartidoActivo(null)} className="text-[#D4A017] font-bold text-sm hover:text-white transition-all">← Volver al Calendario</button>
        
        {/* Marcador en Vivo */}
        <div className="bg-gradient-to-r from-[#141414] to-[#1c1c1c] rounded-2xl border border-[#2E2E2E] p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A017]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="text-center flex-1 z-10">
            <h3 className="text-2xl font-black text-white">{partidoActivo.home?.name}</h3>
            <p className="text-gray-500 font-bold text-xs uppercase">Local</p>
          </div>
          <div className="px-8 z-10 text-center">
            <div className="bg-[#0a0a0a] border border-[#2E2E2E] px-6 py-3 rounded-xl font-mono text-5xl font-black text-[#D4A017] tracking-widest shadow-inner">
              {golesLocal} - {golesVisitante}
            </div>
            {partidoActivo.status === 'finished' ? (
              <span className="inline-block mt-3 bg-green-900/40 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Finalizado</span>
            ) : (
              <span className="inline-block mt-3 bg-red-900/40 text-red-400 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">En Juego</span>
            )}
          </div>
          <div className="text-center flex-1 z-10">
            <h3 className="text-2xl font-black text-white">{partidoActivo.away?.name}</h3>
            <p className="text-gray-500 font-bold text-xs uppercase">Visitante</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Registro (Solo si no ha terminado) */}
          {partidoActivo.status !== 'finished' && (
            <div className="lg:col-span-1 bg-[#141414] border border-[#2E2E2E] rounded-2xl p-6 h-fit">
              <h4 className="text-[#D4A017] font-black uppercase tracking-widest text-sm mb-4 border-b border-[#2E2E2E] pb-2">Registrar Evento</h4>
              <form onSubmit={registrarEvento} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Jugador</label>
                  <select value={eventoJugador} onChange={e => setEventoJugador(e.target.value)} required className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white">
                    <option value="" disabled>Selecciona el jugador</option>
                    <optgroup label={partidoActivo.home?.name}>
                      {jugadores.filter(j => j.team_id === partidoActivo.home_team_id).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </optgroup>
                    <optgroup label={partidoActivo.away?.name}>
                      {jugadores.filter(j => j.team_id === partidoActivo.away_team_id).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Suceso</label>
                    <select value={eventoTipo} onChange={e => setEventoTipo(e.target.value)} className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white">
                      <option value="gol">⚽ Gol</option>
                      <option value="amarilla">🟨 Amarilla</option>
                      <option value="roja">🟥 Roja</option>
                      <option value="mvp">🌟 MVP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Minuto</label>
                    <input type="number" value={eventoMinuto} onChange={e => setEventoMinuto(e.target.value)} placeholder="Ej: 45" className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white" />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-[#1c1c1c] text-white border border-[#2e2e2e] font-bold uppercase rounded hover:border-[#D4A017] hover:text-[#D4A017] transition-all">
                  Guardar Evento
                </button>
              </form>
              <button onClick={finalizarPartido} disabled={loading} className="w-full mt-6 py-3 bg-red-600/20 text-red-500 border border-red-600 font-black uppercase rounded-xl hover:bg-red-600 hover:text-white transition-all">
                {loading ? "Calculando..." : "Terminar Partido"}
              </button>
            </div>
          )}

          {/* Línea de Tiempo (Historial) */}
          <div className="lg:col-span-2 bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl p-6">
            <h4 className="text-white font-black uppercase tracking-widest text-sm mb-4">Minuto a Minuto</h4>
            <div className="space-y-3">
              {eventos.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-10">No hay eventos registrados en este partido.</p>
              ) : (
                eventos.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between bg-[#141414] p-3 rounded-xl border border-[#2E2E2E]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#0a0a0a] rounded-lg border border-[#2E2E2E] flex items-center justify-center text-lg">
                        {ev.event_type === 'gol' && '⚽'}
                        {ev.event_type === 'amarilla' && '🟨'}
                        {ev.event_type === 'roja' && '🟥'}
                        {ev.event_type === 'mvp' && '🌟'}
                      </div>
                      <div>
                        <p className="text-white font-bold">{ev.players?.name} <span className="text-gray-500 font-normal text-xs ml-2">({ev.teams?.name})</span></p>
                        <p className="text-xs text-[#D4A017] font-bold uppercase tracking-wider">{ev.event_type} {ev.minute ? `- Min ${ev.minute}'` : ''}</p>
                      </div>
                    </div>
                    {partidoActivo.status !== 'finished' && (
                      <button onClick={() => eliminarEvento(ev.id)} className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1 bg-red-900/20 rounded">Anular</button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 1: CALENDARIO PRINCIPAL (Default)
  // ============================================================================
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white">Programación de Partidos</h2>
      
      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        <form onSubmit={programarPartido} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Club Local</label>
            <select value={localId} onChange={e => setLocalId(e.target.value)} required className="w-full p-3 mt-1 text-black">
              <option value="" disabled>Seleccionar...</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Club Visitante</label>
            <select value={visitanteId} onChange={e => setVisitanteId(e.target.value)} required className="w-full p-3 mt-1 text-black">
              <option value="" disabled>Seleccionar...</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fecha y Hora</label>
            <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} required className="w-full p-3 mt-1 text-black" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)]">
            {loading ? "Guardando..." : "Programar"}
          </button>
        </form>
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden p-6">
        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-6 border-b border-[#2E2E2E] pb-2">Calendario Oficial</h3>
        <div className="space-y-4">
          {partidos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay partidos programados.</p>
          ) : (
            partidos.map(p => (
              <div key={p.id} className="flex flex-col md:flex-row items-center justify-between bg-[#141414] border border-[#2E2E2E] p-4 rounded-xl gap-4 hover:border-[#D4A017] transition-all">
                <div className="flex-1 text-right font-bold text-white text-lg">{p.home?.name}</div>
                <div className="flex flex-col items-center px-4 w-48">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{new Date(p.match_date).toLocaleString('es-EC', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                  <div className="bg-[#0a0a0a] border border-[#2E2E2E] px-4 py-2 rounded-lg font-mono font-black text-xl text-[#D4A017] w-full text-center">
                    {p.status === 'finished' ? `${p.home_goals} - ${p.away_goals}` : "VS"}
                  </div>
                </div>
                <div className="flex-1 text-left font-bold text-white text-lg">{p.away?.name}</div>
                
                <div className="md:ml-4">
                  <button onClick={() => abrirPartido(p)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${p.status === 'finished' ? 'bg-[#2E2E2E] text-gray-400 hover:text-white' : 'bg-[#D4A017] text-black hover:bg-yellow-500 shadow-[0_0_10px_rgba(212,160,23,0.3)]'}`}>
                    {p.status === 'finished' ? 'Ver Detalles' : 'Jugar Partido'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
