"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";

export default function PartidosPage() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Tabs de Programación
  const [modoProgramacion, setModoProgramacion] = useState<"manual" | "automatico">("manual");

  // Opciones de Fases del Torneo
  const opcionesFase = ["Fase de Grupos", "16vos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Tercer Lugar", "Final"];

  // Estados para nuevo partido (MANUAL)
  const [localId, setLocalId] = useState("");
  const [visitanteId, setVisitanteId] = useState("");
  const [fecha, setFecha] = useState("");
  const [jornadaManual, setJornadaManual] = useState<number>(1);
  const [canchaManual, setCanchaManual] = useState("Cancha 1");
  const [faseManual, setFaseManual] = useState("Fase de Grupos");

  // Estados para nuevo partido (AUTOMÁTICO)
  const [autoJornada, setAutoJornada] = useState<number>(1);
  const [autoDia, setAutoDia] = useState("");
  const [autoHoraInicio, setAutoHoraInicio] = useState("09:30");
  const [autoDuracion, setAutoDuracion] = useState<number>(60);
  const [autoCancha, setAutoCancha] = useState("Cancha 1");
  const [autoFase, setAutoFase] = useState("Fase de Grupos");

  // Estados para Filtro y Descarga
  const [filtroJornada, setFiltroJornada] = useState<number | "">("");
  const capturaRef = useRef<HTMLDivElement>(null);
  const [appUrl, setAppUrl] = useState("");

  // Estados para la Vista de "Partido en Vivo"
  const [partidoActivo, setPartidoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoTipo, setEventoTipo] = useState("gol");
  const [eventoJugador, setEventoJugador] = useState("");
  const [eventoMinuto, setEventoMinuto] = useState("");
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
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

  const programarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localId === visitanteId) return alert("Un equipo no puede jugar contra sí mismo.");
    setLoading(true);
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      if (!tourney) throw new Error("Debes configurar un torneo primero.");

      const { error } = await supabase.from("matches").insert([{
        tournament_id: tourney.id,
        home_team_id: localId,
        away_team_id: visitanteId,
        match_date: fecha,
        matchday: jornadaManual,
        court: canchaManual,
        stage: faseManual
      }]);
      if (error) throw error;
      
      setLocalId(""); setVisitanteId(""); setFecha("");
      cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  // 🤖 MOTOR AUTOMÁTICO ANTIRREPETICIÓN
  const generarFechaAutomatica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDia || !autoHoraInicio) return alert("Faltan datos de fecha/hora.");
    if (!window.confirm(`¿Generar Fecha ${autoJornada} de ${autoFase}?`)) return;
    
    setLoading(true);
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      if (!tourney) throw new Error("Debes configurar un torneo primero.");

      // Crear un registro de partidos ya jugados para no repetirlos
      const historialCruces = new Set(
        partidos.map(p => `${p.home_team_id}-${p.away_team_id}`)
      );
      const historialCrucesInverso = new Set(
        partidos.map(p => `${p.away_team_id}-${p.home_team_id}`)
      );

      let matchesToInsert = [];
      let currentDate = new Date(`${autoDia}T${autoHoraInicio}:00`);
      let maxIntentos = 100; // Evitar bucles infinitos si no hay combinaciones posibles
      let exito = false;

      // Algoritmo de emparejamiento con reintentos
      while (maxIntentos > 0 && !exito) {
        let equiposDisponibles = [...equipos];
        let combinacionValida = true;
        let tempMatches = [];

        // Desordenar equipos aleatoriamente (Fisher-Yates)
        for (let i = equiposDisponibles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [equiposDisponibles[i], equiposDisponibles[j]] = [equiposDisponibles[j], equiposDisponibles[i]];
        }

        while (equiposDisponibles.length >= 2) {
          const homeTeam = equiposDisponibles.pop();
          const awayTeam = equiposDisponibles.pop();

          if (!homeTeam || !awayTeam) break;

          const cruce1 = `${homeTeam.id}-${awayTeam.id}`;
          const cruce2 = `${awayTeam.id}-${homeTeam.id}`;

          // Validar si ya jugaron en este torneo
          if (historialCruces.has(cruce1) || historialCrucesInverso.has(cruce1) || historialCruces.has(cruce2) || historialCrucesInverso.has(cruce2)) {
            combinacionValida = false;
            break; // Romper este intento, volver a mezclar
          }

          tempMatches.push({
            tournament_id: tourney.id,
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
            matchday: autoJornada,
            court: autoCancha,
            stage: autoFase,
            match_date: null // Se asignará si la fecha completa es válida
          });
        }

        if (combinacionValida) {
          // Asignar horarios exactos a la combinación exitosa
          matchesToInsert = tempMatches.map((match) => {
             const fechaAsignada = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString();
             currentDate.setMinutes(currentDate.getMinutes() + autoDuracion);
             return { ...match, match_date: fechaAsignada };
          });
          exito = true;
        }
        
        maxIntentos--;
      }

      if (!exito) {
        throw new Error("No se pudo generar la fecha. Es posible que todos los equipos ya hayan jugado contra todos (Fin de temporada regular).");
      }

      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      
      alert(`¡Fecha ${autoJornada} generada con éxito sin repetir cruces!`);
      cargarDatos();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE PARTIDO EN VIVO ---
  const abrirPartido = async (partido: any) => {
    setPartidoActivo(partido);
    const { data: playersData } = await supabase.from("players")
      .select("id, full_name, team_id, teams(name)")
      .in("team_id", [partido.home_team_id, partido.away_team_id])
      .order("full_name");
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

  const actualizarEvento = async (id: string, nuevoTipo: string, nuevoMinuto: string) => {
    try {
      await supabase.from("match_events").update({ event_type: nuevoTipo, minute: nuevoMinuto ? parseInt(nuevoMinuto) : null }).eq("id", id);
      setEditandoEventoId(null);
      cargarEventos(partidoActivo.id);
    } catch (error) { alert("Error al actualizar evento."); }
  };

  const eliminarEvento = async (id: string) => {
    if (!window.confirm("¿Borrar este evento?")) return;
    await supabase.from("match_events").delete().eq("id", id);
    cargarEventos(partidoActivo.id);
  };

  const finalizarPartido = async () => {
    if (!window.confirm("¿Seguro que deseas finalizar el partido?")) return;
    setLoading(true);
    const golesLocal = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.home_team_id).length;
    const golesVisitante = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.away_team_id).length;
    try {
      await supabase.from("matches").update({ status: "finished", home_goals: golesLocal, away_goals: golesVisitante }).eq("id", partidoActivo.id);
      setPartidoActivo(null);
      cargarDatos();
    } catch (error) { alert("Error al finalizar."); } finally { setLoading(false); }
  };

  // 📸 FUNCIÓN: Descargar Calendario GAME-LEGAL PRO
  const descargarCalendario = async () => {
    if (!capturaRef.current) return;
    setLoading(true);
    try {
      capturaRef.current.style.display = "block";
      const canvas = await html2canvas(capturaRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true
      });
      capturaRef.current.style.display = "none";
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Póster-Fecha-${filtroJornada || 'General'}.png`;
      link.click();
    } catch (error) {
      alert("Error al generar la imagen.");
    } finally {
      setLoading(false);
    }
  };

  const partidosFiltrados = filtroJornada 
    ? partidos.filter(p => p.matchday === filtroJornada)
    : partidos;

  // ============================================================================
  // VISTA 2: PANEL DE CONTROL EN VIVO
  // ============================================================================
  if (partidoActivo) {
    const golesLocal = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.home_team_id).length;
    const golesVisitante = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.away_team_id).length;
    return (
      <div className="space-y-6">
        <button onClick={() => setPartidoActivo(null)} className="text-[#D4A017] font-bold text-sm hover:text-white transition-all">← Volver al Calendario</button>
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
          {partidoActivo.status !== 'finished' && (
            <div className="lg:col-span-1 bg-[#141414] border border-[#2E2E2E] rounded-2xl p-6 h-fit">
              <h4 className="text-[#D4A017] font-black uppercase tracking-widest text-sm mb-4 border-b border-[#2E2E2E] pb-2">Registrar Evento</h4>
              <form onSubmit={registrarEvento} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Jugador</label>
                  <select value={eventoJugador} onChange={e => setEventoJugador(e.target.value)} required className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white">
                    <option value="" disabled>Selecciona el jugador</option>
                    <optgroup label={partidoActivo.home?.name}>
                      {jugadores.filter(j => j.team_id === partidoActivo.home_team_id).map(j => <option key={j.id} value={j.id}>{j.full_name}</option>)}
                    </optgroup>
                    <optgroup label={partidoActivo.away?.name}>
                      {jugadores.filter(j => j.team_id === partidoActivo.away_team_id).map(j => <option key={j.id} value={j.id}>{j.full_name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Suceso</label>
                    <select value={eventoTipo} onChange={e => setEventoTipo(e.target.value)} className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white">
                      <option value="gol">⚽ Gol</option><option value="amarilla">🟨 Amarilla</option><option value="roja">🟥 Roja</option><option value="mvp">🌟 MVP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Minuto</label>
                    <input type="number" value={eventoMinuto} onChange={e => setEventoMinuto(e.target.value)} placeholder="Ej: 45" className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white" />
                  </div>
                </div>
                <button type="submit" className="w-full py-2 bg-[#1c1c1c] text-white border border-[#2e2e2e] font-bold uppercase rounded hover:border-[#D4A017] hover:text-[#D4A017] transition-all">Guardar Evento</button>
              </form>
              <button onClick={finalizarPartido} disabled={loading} className="w-full mt-6 py-3 bg-red-600/20 text-red-500 border border-red-600 font-black uppercase rounded-xl hover:bg-red-600 hover:text-white transition-all">Terminar Partido</button>
            </div>
          )}

          <div className="lg:col-span-2 bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl p-6">
            <h4 className="text-white font-black uppercase tracking-widest text-sm mb-4">Minuto a Minuto</h4>
            <div className="space-y-3">
              {eventos.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-10">No hay eventos registrados en este partido.</p>
              ) : (
                eventos.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between bg-[#141414] p-3 rounded-xl border border-[#2E2E2E]">
                    {editandoEventoId === ev.id ? (
                      <div className="flex items-center gap-4 w-full">
                        <select id={`edit-t-${ev.id}`} defaultValue={ev.event_type} className="bg-black p-2 text-white rounded border border-[#2e2e2e]">
                          <option value="gol">⚽ Gol</option><option value="amarilla">🟨 Amarilla</option><option value="roja">🟥 Roja</option><option value="mvp">🌟 MVP</option>
                        </select>
                        <input id={`edit-m-${ev.id}`} type="number" defaultValue={ev.minute || ""} placeholder="Minuto" className="bg-black p-2 text-white w-20 rounded border border-[#2e2e2e]" />
                        <div className="flex gap-2 ml-auto">
                          <button onClick={() => actualizarEvento(ev.id, (document.getElementById(`edit-t-${ev.id}`) as HTMLSelectElement).value, (document.getElementById(`edit-m-${ev.id}`) as HTMLInputElement).value)} className="text-green-500 hover:text-green-400 text-xs font-bold px-3 py-2 bg-green-900/20 rounded">Guardar</button>
                          <button onClick={() => setEditandoEventoId(null)} className="text-gray-500 hover:text-gray-400 text-xs font-bold px-3 py-2 bg-gray-900/20 rounded">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#0a0a0a] rounded-lg border border-[#2E2E2E] flex items-center justify-center text-lg">
                            {ev.event_type === 'gol' && '⚽'}
                            {ev.event_type === 'amarilla' && '🟨'}
                            {ev.event_type === 'roja' && '🟥'}
                            {ev.event_type === 'mvp' && '🌟'}
                          </div>
                          <div>
                            <p className="text-white font-bold">{ev.players?.full_name} <span className="text-gray-500 font-normal text-xs ml-2">({ev.teams?.name})</span></p>
                            <p className="text-xs text-[#D4A017] font-bold uppercase tracking-wider">{ev.event_type} {ev.minute ? `- Min ${ev.minute}'` : ''}</p>
                          </div>
                        </div>
                        {partidoActivo.status !== 'finished' && (
                          <div className="flex gap-2">
                            <button onClick={() => setEditandoEventoId(ev.id)} className="text-[#D4A017] hover:text-yellow-300 text-xs font-bold px-2 py-1 bg-[#D4A017]/10 rounded">Editar</button>
                            <button onClick={() => eliminarEvento(ev.id)} className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1 bg-red-900/20 rounded">Anular</button>
                          </div>
                        )}
                      </>
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
  // VISTA 1: CALENDARIO PRINCIPAL
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-[#2E2E2E] pb-4">
        <h2 className="text-3xl font-black text-white uppercase tracking-wider">Programación de Fechas</h2>
        <div className="bg-[#1C1C1C] p-1 rounded-lg border border-[#2E2E2E] flex">
          <button onClick={() => setModoProgramacion("manual")} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${modoProgramacion === "manual" ? "bg-[#D4A017] text-black shadow-lg" : "text-gray-400 hover:text-white"}`}>Manual</button>
          <button onClick={() => setModoProgramacion("automatico")} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${modoProgramacion === "automatico" ? "bg-[#2E2E2E] text-[#D4A017] border border-[#D4A017]/30 shadow-lg" : "text-gray-400 hover:text-white"}`}>⚡ Motor Automático</button>
        </div>
      </div>
      
      {/* ======================= FORMULARIOS ======================= */}
      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        {modoProgramacion === "manual" ? (
          <form onSubmit={programarPartido} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Local</label><select value={localId} onChange={e => setLocalId(e.target.value)} required className="w-full p-3 mt-1 text-black rounded"><option value="" disabled>Seleccionar...</option>{equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Visitante</label><select value={visitanteId} onChange={e => setVisitanteId(e.target.value)} required className="w-full p-3 mt-1 text-black rounded"><option value="" disabled>Seleccionar...</option>{equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Instancia</label><select value={faseManual} onChange={e => setFaseManual(e.target.value)} className="w-full p-3 mt-1 text-black rounded">{opcionesFase.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Jornada/Llave</label><input type="number" value={jornadaManual} onChange={e => setJornadaManual(Number(e.target.value))} required className="w-full p-3 mt-1 text-black rounded" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Cancha</label><input type="text" value={canchaManual} onChange={e => setCanchaManual(e.target.value)} className="w-full p-3 mt-1 text-black rounded" placeholder="Ej: Cancha 1" /></div>
            <div className="md:col-span-3"><label className="text-xs font-bold text-gray-500 uppercase">Fecha/Hora</label><input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} required className="w-full p-3 mt-1 text-black rounded" /></div>
            <button type="submit" disabled={loading} className="md:col-span-2 py-3 bg-[#D4A017] text-black font-black uppercase rounded shadow-[0_0_15px_rgba(212,160,23,0.3)]">{loading ? "Guardando..." : "Programar"}</button>
          </form>
        ) : (
          <form onSubmit={generarFechaAutomatica} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-[#1C1C1C] p-6 border border-[#D4A017]/30 rounded-xl">
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Día a jugar</label><input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Hora de Inicio</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Duración (Min)</label><input type="number" value={autoDuracion} onChange={e => setAutoDuracion(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Número Fecha</label><input type="number" value={autoJornada} onChange={e => setAutoJornada(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Instancia</label><select value={autoFase} onChange={e => setAutoFase(e.target.value)} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded">{opcionesFase.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
            <button type="submit" disabled={loading} className="py-3 bg-[#D4A017] text-black font-black uppercase rounded shadow-[0_0_15px_rgba(212,160,23,0.4)] hover:bg-yellow-500 transition-all">⚡ Auto Generar</button>
          </form>
        )}
      </div>

      {/* ======================= LISTA DE PARTIDOS ======================= */}
      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-[#2E2E2E] pb-4 gap-4">
          <h3 className="text-white font-black uppercase tracking-widest text-sm">Calendario Oficial</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Ver Fecha:</label>
              <select value={filtroJornada} onChange={e => setFiltroJornada(e.target.value ? Number(e.target.value) : "")} className="bg-[#141414] text-[#D4A017] font-black border border-[#2E2E2E] p-2 rounded outline-none">
                <option value="">Todas</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(n => <option key={n} value={n}>Fecha {n}</option>)}
              </select>
            </div>
            <button onClick={descargarCalendario} disabled={loading || partidosFiltrados.length === 0} className="bg-transparent border border-[#D4A017] text-[#D4A017] hover:bg-[#D4A017] hover:text-black font-black uppercase text-xs px-4 py-2 rounded shadow-lg transition-all flex items-center gap-2">
              📸 Descargar Póster
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {partidosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay partidos para la fecha seleccionada.</p>
          ) : (
            partidosFiltrados.map(p => (
              <div key={p.id} className="flex flex-col md:flex-row items-center justify-between bg-[#141414] border border-[#2E2E2E] p-4 rounded-xl gap-4 hover:border-[#D4A017] transition-all relative overflow-hidden">
                {/* Etiqueta de Fase (Ej: "Semifinal") */}
                {p.stage !== 'Fase de Grupos' && (
                  <div className="absolute top-0 left-0 bg-[#D4A017] text-black text-[9px] font-black uppercase px-3 py-1 rounded-br-lg shadow-lg">
                    {p.stage}
                  </div>
                )}
                
                <div className="flex-1 text-right font-bold text-white text-lg mt-4 md:mt-0">
                  <p className="text-[10px] text-gray-500 font-normal uppercase">Fecha {p.matchday} • {p.court || "Cancha 1"}</p>
                  {p.home?.name}
                </div>
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

      {/* ==============================================================================
          📸 LIENZO DE CAPTURA ORIGINAL "GAME-LEGAL PRO"
          ============================================================================== */}
      <div style={{ display: "none" }} ref={capturaRef}>
        <div className="bg-[#0a0a0a] p-10 w-[800px] font-sans relative overflow-hidden border-8 border-[#D4A017]">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4A017]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          {/* CABECERA (LOGOS, TÍTULO, QR) */}
          <div className="flex justify-between items-start mb-10 relative z-10 border-b border-[#2E2E2E] pb-6">
            <div>
              <h1 className="text-4xl font-black text-white tracking-widest uppercase">CRONOGRAMA OFICIAL</h1>
              <p className="text-[#D4A017] font-bold text-xl tracking-widest uppercase mt-2">
                {partidosFiltrados.length > 0 ? partidosFiltrados[0].stage.toUpperCase() : "TODOS LOS PARTIDOS"} {filtroJornada ? ` - FECHA ${filtroJornada}` : ""}
              </p>
              {partidosFiltrados.length > 0 && (
                <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mt-2">
                  {new Date(partidosFiltrados[0].match_date).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            <div className="bg-[#1C1C1C] p-2 rounded-xl flex flex-col items-center shadow-2xl border border-[#D4A017]">
              {appUrl && <QRCodeSVG value={appUrl} size={90} level={"H"} fgColor="#D4A017" bgColor="#1C1C1C" />}
              <span className="text-[10px] text-white font-black uppercase mt-1">Ver en Vivo</span>
            </div>
          </div>

          {/* GRILLA DE PARTIDOS - ESTILO GAME-LEGAL */}
          <div className="space-y-4 relative z-10">
            {partidosFiltrados.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#141414] border border-[#2e2e2e] rounded-full pr-6 pl-6 py-2 shadow-lg relative h-20">
                
                <div className="flex-1 flex items-center justify-end gap-4">
                  <span className="font-black text-white text-xl uppercase tracking-wider">{p.home?.name}</span>
                  {p.home?.shield_url ? <img src={p.home.shield_url} crossOrigin="anonymous" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 bg-[#2e2e2e] rounded-full"></div>}
                </div>
                
                {/* Triángulo Dorado Invertido */}
                <div className="w-32 flex flex-col items-center justify-center relative z-20 mx-4 h-full">
                   <div className="w-24 h-24 bg-gradient-to-b from-[#D4A017] to-yellow-600 flex flex-col items-center justify-start shadow-2xl absolute -top-2" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}>
                      <span className="text-black font-black text-2xl italic mt-2">VS</span>
                   </div>
                   <div className="bg-[#0a0a0a] px-4 py-1 rounded-full border border-[#D4A017] absolute -bottom-4 z-30 shadow-lg">
                     <span className="text-[#D4A017] font-black text-sm">{new Date(p.match_date).toLocaleTimeString('es-EC', { hour: '2-digit', minute:'2-digit' }).replace(':', 'H')}</span>
                   </div>
                </div>

                <div className="flex-1 flex items-center justify-start gap-4">
                  {p.away?.shield_url ? <img src={p.away.shield_url} crossOrigin="anonymous" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 bg-[#2e2e2e] rounded-full"></div>}
                  <span className="font-black text-white text-xl uppercase tracking-wider">{p.away?.name}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16 mb-4 bg-[#D4A017] py-3 rounded-xl mx-10 shadow-2xl">
            <h2 className="text-xl font-black text-black uppercase tracking-widest">Organización Deportiva Profesional</h2>
          </div>
          
          <div className="text-center mt-6">
             <p className="text-gray-500 text-xs tracking-[0.3em] uppercase">Powered by GAME-LEGAL PRO</p>
          </div>
        </div>
      </div>

    </div>
  );
}
