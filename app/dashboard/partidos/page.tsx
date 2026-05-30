"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import { offlineStore } from "@/lib/offlineStore"; // <-- IMPORTACIÓN DEL MODO OFFLINE

export default function PartidosPage() {
  const [torneoSlug, setTorneoSlug] = useState<string>("");
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [costoArbitraje, setCostoArbitraje] = useState<number>(20);
  const [pagosArbitraje, setPagosArbitraje] = useState<string[]>([]);
  
  const [partidos, setPartidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // NUEVO: ESTADO OFFLINE
  const [isOffline, setIsOffline] = useState(false);

  // Tabs de Programación
  const [modoProgramacion, setModoProgramacion] = useState<"manual" | "automatico" | "eliminatorias">("manual");

  // Opciones de Fases
  const opcionesFase = ["Fase de Grupos", "16vos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Tercer Lugar", "Final"];

  // Estados Manuales, Automáticos, Eliminatorias y Filtros (Intactos)
  const [localId, setLocalId] = useState("");
  const [visitanteId, setVisitanteId] = useState("");
  const [fecha, setFecha] = useState("");
  const [jornadaManual, setJornadaManual] = useState<number>(1);
  const [canchaManual, setCanchaManual] = useState("Cancha 1");
  const [faseManual, setFaseManual] = useState("Fase de Grupos");

  const [autoJornada, setAutoJornada] = useState<number>(1);
  const [autoDia, setAutoDia] = useState("");
  const [autoHoraInicio, setAutoHoraInicio] = useState("09:30");
  const [autoDuracion, setAutoDuracion] = useState<number>(60);
  const [autoCancha, setAutoCancha] = useState("Cancha 1");
  const [autoFase, setAutoFase] = useState("Fase de Grupos");
  const [idaYVuelta, setIdaYVuelta] = useState<boolean>(false);

  const [formatoEliminatoria, setFormatoEliminatoria] = useState("Un Solo Partido (Playoff)");
  const [faseGenerar, setFaseGenerar] = useState("Cuartos de Final");

  const [filtroJornada, setFiltroJornada] = useState<number | "">("");
  const capturaRef = useRef<HTMLDivElement>(null);
  const [appUrl, setAppUrl] = useState("");

  const [partidoActivo, setPartidoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoTipo, setEventoTipo] = useState("gol");
  const [eventoJugador, setEventoJugador] = useState("");
  const [eventoMinuto, setEventoMinuto] = useState("");
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null);

  // ============================================================================
  // NUEVO: ESCUCHADOR DE RED (PLAN DE CONTINGENCIA)
  // ============================================================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => {
        setIsOffline(false);
        // Pequeño retraso para asegurar que la conexión es estable antes de sincronizar
        setTimeout(async () => {
          await offlineStore.sincronizarDatosPendientes();
          if (partidoActivo) {
            cargarEventos(partidoActivo.id);
            cargarPagosArbitraje(partidoActivo.id);
          }
        }, 1500);
      };

      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [partidoActivo]);

  useEffect(() => {
    cargarDatos();
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, []);

  const { data: tourney } = await supabase.from('tournaments').select('referee_fee, slug').eq('id', activeId).single();
    if (tourney) {
      setCostoArbitraje(Number(tourney.referee_fee || 20));
      setTorneoSlug(tourney.slug); // <-- Guardamos el slug
    }
    if (!activeId) return;
    setTorneoId(activeId);

    const { data: tourney } = await supabase.from('tournaments').select('referee_fee').eq('id', activeId).single();
    if (tourney) setCostoArbitraje(Number(tourney.referee_fee || 20));

    const { data: teamsData } = await supabase.from("teams").select("id, name").eq("tournament_id", activeId).order("name");
    if (teamsData) setEquipos(teamsData);

    const { data: matchesData } = await supabase.from("matches")
      .select("*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)")
      .eq("tournament_id", activeId).order("match_date", { ascending: true });
    if (matchesData) setPartidos(matchesData);
  };

  const programarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localId === visitanteId) return alert("Un equipo no puede jugar contra sí mismo.");
    if (!torneoId) return alert("No hay torneo activo.");
    setLoading(true);
    try {
      const { error } = await supabase.from("matches").insert([{
        tournament_id: torneoId, home_team_id: localId, away_team_id: visitanteId,
        match_date: fecha, matchday: jornadaManual, court: canchaManual, stage: faseManual
      }]);
      if (error) throw error;
      setLocalId(""); setVisitanteId(""); setFecha(""); cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  const generarFechaAutomatica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDia || !autoHoraInicio) return alert("Faltan datos de fecha/hora.");
    if (!torneoId) return alert("No hay torneo activo.");
    if (!window.confirm(`¿Generar Fecha ${autoJornada} de ${autoFase}?`)) return;
    setLoading(true);
    try {
      const historialCruces = new Set(partidos.map(p => `${p.home_team_id}-${p.away_team_id}`));
      const historialCrucesInverso = new Set(partidos.map(p => `${p.away_team_id}-${p.home_team_id}`));
      
      let matchesToInsert: any[] = [];
      let currentDate = new Date(`${autoDia}T${autoHoraInicio}:00`);
      let maxIntentos = 100, exito = false;

      while (maxIntentos > 0 && !exito) {
        let equiposDisponibles = [...equipos];
        let combinacionValida = true;
        let tempMatches: any[] = [];
        
        for (let i = equiposDisponibles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [equiposDisponibles[i], equiposDisponibles[j]] = [equiposDisponibles[j], equiposDisponibles[i]];
        }
        while (equiposDisponibles.length >= 2) {
          const homeTeam = equiposDisponibles.pop();
          const awayTeam = equiposDisponibles.pop();
          const cruce1 = `${homeTeam.id}-${awayTeam.id}`;
          const cruce2 = `${awayTeam.id}-${homeTeam.id}`;
          
          let yaJugaron = idaYVuelta 
            ? (historialCruces.has(cruce1) || historialCruces.has(cruce2)) 
            : (historialCruces.has(cruce1) || historialCrucesInverso.has(cruce1) || historialCruces.has(cruce2) || historialCrucesInverso.has(cruce2));
          
          if (yaJugaron) { combinacionValida = false; break; }
          tempMatches.push({ tournament_id: torneoId, home_team_id: homeTeam.id, away_team_id: awayTeam.id, matchday: autoJornada, court: autoCancha, stage: autoFase, match_date: null });
        }
        if (combinacionValida) {
          matchesToInsert = tempMatches.map((match) => {
             const fechaAsignada = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString();
             currentDate.setMinutes(currentDate.getMinutes() + autoDuracion);
             return { ...match, match_date: fechaAsignada };
          });
          exito = true;
        }
        maxIntentos--;
      }
      if (!exito) throw new Error("No se pudo generar. Equipos agotaron cruces posibles para este formato.");
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      alert(`¡Fecha ${autoJornada} generada con éxito!`); cargarDatos();
    } catch (error: any) { alert(error.message); } finally { setLoading(false); }
  };

  const generarLlavesAutomaticas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDia || !autoHoraInicio) return alert("Define el día y la hora de inicio en los campos inferiores primero.");
    if (!torneoId) return alert("No hay torneo activo.");
    if (!window.confirm(`¿Calcular clasificados y generar ${faseGenerar}?`)) return;
    setLoading(true);

    try {
      const matchesGrupos = partidos.filter(p => p.stage === "Fase de Grupos" && p.status === "finished");
      const stats: Record<string, any> = {};
      equipos.forEach(t => { stats[t.id] = { id: t.id, gf: 0, gc: 0, pts: 0 }; });
      
      matchesGrupos.forEach(m => {
        if (stats[m.home_team_id] && stats[m.away_team_id]) {
          stats[m.home_team_id].gf += m.home_goals || 0; stats[m.away_team_id].gf += m.away_goals || 0;
          stats[m.home_team_id].gc += m.away_goals || 0; stats[m.away_team_id].gc += m.home_goals || 0;
          if (m.home_goals > m.away_goals) stats[m.home_team_id].pts += 3;
          else if (m.away_goals > m.home_goals) stats[m.away_team_id].pts += 3;
          else { stats[m.home_team_id].pts += 1; stats[m.away_team_id].pts += 1; }
        }
      });

      const clasificacionGlobal = Object.values(stats)
        .map(s => ({ ...s, gd: s.gf - s.gc }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

      let numEquipos = 0;
      if (faseGenerar === "Octavos de Final") numEquipos = 16;
      else if (faseGenerar === "Cuartos de Final") numEquipos = 8;
      else if (faseGenerar === "Semifinal") numEquipos = 4;
      else if (faseGenerar === "Final") numEquipos = 2;

      if (clasificacionGlobal.length < numEquipos) throw new Error("No hay suficientes equipos en el torneo para armar esta fase.");

      const clasificados = clasificacionGlobal.slice(0, numEquipos);
      
      let matchesToInsert: any[] = [];
      let currentDate = new Date(`${autoDia}T${autoHoraInicio}:00`);

      for (let i = 0; i < numEquipos / 2; i++) {
        const mejor = clasificados[i];
        const peor = clasificados[numEquipos - 1 - i];

        const fechaAsignadaIda = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString();
        matchesToInsert.push({
          tournament_id: torneoId, home_team_id: mejor.id, away_team_id: peor.id,
          matchday: autoJornada, court: autoCancha, stage: faseGenerar, match_date: fechaAsignadaIda
        });
        currentDate.setMinutes(currentDate.getMinutes() + autoDuracion);

        if (formatoEliminatoria === "Ida y Vuelta (Estilo Libertadores)") {
           const fechaAsignadaVuelta = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString();
           matchesToInsert.push({
             tournament_id: torneoId, home_team_id: peor.id, away_team_id: mejor.id,
             matchday: autoJornada + 1, court: autoCancha, stage: `${faseGenerar} (Vuelta)`, match_date: fechaAsignadaVuelta
           });
           currentDate.setMinutes(currentDate.getMinutes() + autoDuracion);
        }
      }

      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      
      alert(`¡Llaves de ${faseGenerar} creadas con éxito! Clasificaron los mejores ${numEquipos}.`);
      cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  const eliminarPartido = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este partido programado? (Esta acción no se puede deshacer)")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
      cargarDatos();
    } catch (error: any) { alert("Error al eliminar: " + error.message); } finally { setLoading(false); }
  };

  // --- LÓGICA DE PARTIDO EN VIVO ---
  const abrirPartido = async (partido: any) => {
    setPartidoActivo(partido);
    const { data: playersData } = await supabase.from("players").select("id, full_name, team_id, teams(name)").in("team_id", [partido.home_team_id, partido.away_team_id]).order("full_name");
    if (playersData) setJugadores(playersData);
    cargarEventos(partido.id);
    cargarPagosArbitraje(partido.id);
  };

  const cargarEventos = async (matchId: string) => {
    const { data } = await supabase.from("match_events").select("*, players(full_name), teams(name)").eq("match_id", matchId).order("created_at", { ascending: false });
    if (data) setEventos(data);
  };

  const cargarPagosArbitraje = async (matchId: string) => {
    const { data } = await supabase.from("payments").select("team_id").eq("match_id", matchId).eq("concept", "arbitraje");
    if (data) setPagosArbitraje(data.map(p => p.team_id));
  };

  // ============================================================================
  // INTEGRACIÓN OFFLINE: PAGOS Y EVENTOS
  // ============================================================================
  const registrarPagoArbitraje = async (teamId: string, teamName: string) => {
    if (!window.confirm(`¿Registrar abono de arbitraje en cancha ($${costoArbitraje}) para el club ${teamName}?`)) return;
    setLoading(true);
    try {
      const pagoData = {
         tournament_id: torneoId,
         team_id: teamId,
         match_id: partidoActivo.id,
         amount: costoArbitraje,
         concept: "arbitraje",
         description: `Abono arbitraje directo en cancha - Jornada ${partidoActivo.matchday}`
      };

      if (isOffline) {
        await offlineStore.guardarPagoOffline(pagoData);
        setPagosArbitraje(prev => [...prev, teamId]); // Actualización visual inmediata
        alert(`[MODO OFFLINE] Pago de $${costoArbitraje} guardado en el dispositivo. Se sincronizará en la nube al recuperar conexión.`);
      } else {
        const { error } = await supabase.from("payments").insert([pagoData]);
        if (error) throw error;
        alert(`Pago de $${costoArbitraje} enviado al Libro Mayor de Finanzas.`);
        cargarPagosArbitraje(partidoActivo.id);
      }
    } catch (error: any) {
      alert("Error contable: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const registrarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoJugador) return;
    const jugadorSel = jugadores.find(j => j.id === eventoJugador);
    
    const eventoData = { match_id: partidoActivo.id, player_id: jugadorSel.id, team_id: jugadorSel.team_id, event_type: eventoTipo, minute: eventoMinuto ? parseInt(eventoMinuto) : null };

    if (isOffline) {
      await offlineStore.guardarEventoOffline(eventoData);
      // Actualización visual simulada para el Minuto a Minuto
      setEventos(prev => [{
        ...eventoData,
        id: 'offline-' + Date.now(),
        players: { full_name: jugadorSel.full_name },
        teams: { name: jugadorSel.teams?.name || 'Local' },
        created_at: new Date().toISOString()
      }, ...prev]);
      alert("[MODO OFFLINE] Evento guardado en la memoria de su dispositivo.");
    } else {
      await supabase.from("match_events").insert([eventoData]);
      cargarEventos(partidoActivo.id);
    }

    setEventoJugador(""); setEventoMinuto(""); setEventoTipo("gol"); 
  };

  const actualizarEvento = async (id: string, nuevoTipo: string, nuevoMinuto: string) => {
    if (isOffline) return alert("⚠️ Seguridad: No puedes editar eventos en Modo Offline. Espera a recuperar señal.");
    await supabase.from("match_events").update({ event_type: nuevoTipo, minute: nuevoMinuto ? parseInt(nuevoMinuto) : null }).eq("id", id);
    setEditandoEventoId(null); cargarEventos(partidoActivo.id);
  };

  const eliminarEvento = async (id: string) => {
    if (isOffline) return alert("⚠️ Seguridad: No puedes anular eventos en Modo Offline. Espera a recuperar señal.");
    if (!window.confirm("¿Borrar evento?")) return; await supabase.from("match_events").delete().eq("id", id); cargarEventos(partidoActivo.id);
  };

  const finalizarPartido = async () => {
    if (isOffline) return alert("⚠️ Contingencia: No puedes finalizar y cerrar el acta oficial en Modo Offline. Tus datos están guardados, espera a conectarte a internet para sellar el partido.");
    if (!window.confirm("¿Finalizar? Una vez cerrado no podrás modificar los eventos del partido. Además, se asomarán las deudas por tarjetas en el libro mayor de los equipos.")) return;
    
    setLoading(true);
    const golesLocal = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.home_team_id).length;
    const golesVisitante = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.away_team_id).length;
    await supabase.from("matches").update({ status: "finished", home_goals: golesLocal, away_goals: golesVisitante }).eq("id", partidoActivo.id);
    setPartidoActivo(null); cargarDatos(); setLoading(false);
  };

  const descargarCalendario = async () => {
    if (!capturaRef.current) return; setLoading(true);
    try {
      capturaRef.current.style.display = "block";
      const canvas = await html2canvas(capturaRef.current, { backgroundColor: "#0a0a0a", scale: 2, useCORS: true });
      capturaRef.current.style.display = "none";
      const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `Póster.png`; link.click();
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

 const compartirEnlaceInvitacion = () => {
    const enlaceOficial = `${appUrl}/torneo/${torneoSlug}`;
    const mensaje = `🏆 *¡TE INVITAMOS A SEGUIR EL TORNEO EN VIVO!* 🏆\n\nRevisa el calendario oficial, resultados y el minuto a minuto de los partidos directamente desde nuestra plataforma:\n\n🔗 *Enlace Oficial:*\n${enlaceOficial}\n\n¡No te lo pierdas! ⚽🔥`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const enviarRecordatorioWhatsApp = (p: any) => {
    const enlaceOficial = `${appUrl}/torneo/${torneoSlug}`;
    // ... resto del código del recordatorio usando enlaceOficial en lugar de appUrl
  };

  const partidosFiltrados = filtroJornada ? partidos.filter(p => p.matchday === filtroJornada) : partidos;

  // ============================================================================
  // VISTA 2: PANEL DE CONTROL EN VIVO
  // ============================================================================
  if (partidoActivo) {
    const golesLocal = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.home_team_id).length;
    const golesVisitante = eventos.filter(e => e.event_type === 'gol' && e.team_id === partidoActivo.away_team_id).length;
    return (
      <div className="space-y-6">
        
        {/* BANNER OFFLINE VISUAL */}
        {isOffline && (
          <div className="bg-red-900/90 text-white text-center text-[10px] sm:text-xs font-black py-3 px-4 uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500 animate-pulse flex items-center justify-center gap-2">
            <span>⚠️</span> Estás sin conexión. El Modo Offline guardará los goles y cobros en tu dispositivo.
          </div>
        )}

        <button onClick={() => setPartidoActivo(null)} className="text-[#D4A017] font-bold text-sm hover:text-white transition-all">← Volver al Calendario</button>
        <div className="bg-gradient-to-r from-[#141414] to-[#1c1c1c] rounded-2xl border border-[#2E2E2E] p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A017]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="text-center flex-1 z-10">
            <h3 className="text-2xl font-black text-white">{partidoActivo.home?.name}</h3>
            <p className="text-gray-500 font-bold text-xs uppercase mb-3">Local</p>
            {/* BOTÓN FINANCIERO LOCAL */}
            {pagosArbitraje.includes(partidoActivo.home_team_id) ? (
              <span className="text-green-500 font-bold text-[10px] bg-green-900/20 border border-green-900/50 px-3 py-1 rounded uppercase tracking-widest">✅ Arbitraje Cancelado</span>
            ) : (
              <button onClick={() => registrarPagoArbitraje(partidoActivo.home_team_id, partidoActivo.home.name)} className="text-[#D4A017] border border-[#D4A017]/50 hover:bg-[#D4A017] hover:text-black font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded transition-all shadow-lg">Pagar Arbitraje (${costoArbitraje})</button>
            )}
          </div>
          
          <div className="px-8 z-10 text-center">
            <div className="bg-[#0a0a0a] border border-[#2E2E2E] px-6 py-3 rounded-xl font-mono text-5xl font-black text-[#D4A017] tracking-widest shadow-inner">{golesLocal} - {golesVisitante}</div>
            {partidoActivo.status === 'finished' ? <span className="inline-block mt-3 bg-green-900/40 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Finalizado</span> : <span className="inline-block mt-3 bg-red-900/40 text-red-400 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">En Juego</span>}
          </div>
          
          <div className="text-center flex-1 z-10">
            <h3 className="text-2xl font-black text-white">{partidoActivo.away?.name}</h3>
            <p className="text-gray-500 font-bold text-xs uppercase mb-3">Visitante</p>
            {/* BOTÓN FINANCIERO VISITANTE */}
            {pagosArbitraje.includes(partidoActivo.away_team_id) ? (
              <span className="text-green-500 font-bold text-[10px] bg-green-900/20 border border-green-900/50 px-3 py-1 rounded uppercase tracking-widest">✅ Arbitraje Cancelado</span>
            ) : (
              <button onClick={() => registrarPagoArbitraje(partidoActivo.away_team_id, partidoActivo.away.name)} className="text-[#D4A017] border border-[#D4A017]/50 hover:bg-[#D4A017] hover:text-black font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded transition-all shadow-lg">Pagar Arbitraje (${costoArbitraje})</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {partidoActivo.status !== 'finished' && (
            <div className="lg:col-span-1 bg-[#141414] border border-[#2E2E2E] rounded-2xl p-6 h-fit">
              <form onSubmit={registrarEvento} className="space-y-4">
                <select value={eventoJugador} onChange={e => setEventoJugador(e.target.value)} required className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white">
                    <option value="" disabled>Selecciona el jugador</option>
                    <optgroup label={partidoActivo.home?.name}>{jugadores.filter(j => j.team_id === partidoActivo.home_team_id).map(j => <option key={j.id} value={j.id}>{j.full_name}</option>)}</optgroup>
                    <optgroup label={partidoActivo.away?.name}>{jugadores.filter(j => j.team_id === partidoActivo.away_team_id).map(j => <option key={j.id} value={j.id}>{j.full_name}</option>)}</optgroup>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select value={eventoTipo} onChange={e => setEventoTipo(e.target.value)} className="w-full p-2 mt-1 bg-[#1c1c1c] border border-[#2e2e2e] text-white rounded"><option value="gol">⚽ Gol</option><option value="amarilla">🟨 Amarilla</option><option value="roja">🟥 Roja</option><option value="mvp">🌟 MVP</option></select>
                  <input type="number" value={eventoMinuto} onChange={e => setEventoMinuto(e.target.value)} placeholder="Min" className="w-full p-2 mt-1 bg-[#1c1c1c] border border-[#2e2e2e] text-white rounded" />
                </div>
                <button type="submit" className="w-full py-2 bg-[#1c1c1c] text-white font-bold uppercase rounded border border-[#2e2e2e] hover:border-[#D4A017] hover:text-[#D4A017] transition-all">Guardar Evento</button>
              </form>
              <button onClick={finalizarPartido} disabled={loading} className="w-full mt-6 py-3 bg-red-600/20 text-red-500 font-black uppercase rounded-xl border border-red-600 hover:bg-red-600 hover:text-white transition-all">Terminar Partido</button>
            </div>
          )}

          <div className="lg:col-span-2 bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl p-6">
            <h4 className="text-white font-black uppercase tracking-widest text-sm mb-4">Minuto a Minuto</h4>
            <div className="space-y-3">
              {eventos.map(ev => (
                <div key={ev.id} className="flex items-center justify-between bg-[#141414] p-3 rounded-xl border border-[#2E2E2E]">
                  {editandoEventoId === ev.id ? (
                      <div className="flex items-center gap-4 w-full">
                        <select id={`edit-t-${ev.id}`} defaultValue={ev.event_type} className="bg-black p-2 text-white rounded border border-[#2e2e2e]">
                          <option value="gol">⚽ Gol</option><option value="amarilla">🟨 Amarilla</option><option value="roja">🟥 Roja</option><option value="mvp">🌟 MVP</option>
                        </select>
                        <input id={`edit-m-${ev.id}`} type="number" defaultValue={ev.minute || ""} placeholder="Minuto" className="bg-black p-2 text-white w-20 rounded border border-[#2e2e2e]" />
                        <div className="flex gap-2 ml-auto">
                          <button onClick={() => actualizarEvento(ev.id, (document.getElementById(`edit-t-${ev.id}`) as HTMLSelectElement).value, (document.getElementById(`edit-m-${ev.id}`) as HTMLInputElement).value)} className="text-green-500 font-bold px-3 py-2 bg-green-900/20 rounded text-xs">Guardar</button>
                          <button onClick={() => setEditandoEventoId(null)} className="text-gray-500 font-bold px-3 py-2 bg-gray-900/20 rounded text-xs">Cancelar</button>
                        </div>
                      </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#0a0a0a] rounded-lg border border-[#2E2E2E] flex items-center justify-center text-lg">{ev.event_type === 'gol' && '⚽'}{ev.event_type === 'amarilla' && '🟨'}{ev.event_type === 'roja' && '🟥'}{ev.event_type === 'mvp' && '🌟'}</div>
                        <div>
                          <p className="text-white font-bold uppercase text-[11px] tracking-wide">
                            {ev.players?.full_name} 
                            <span className="text-gray-500 font-normal text-[10px] ml-1">({ev.teams?.name})</span>
                            {/* Insignia visual si el evento está guardado localmente */}
                            {ev.id?.startsWith('offline') && <span className="text-red-500 text-[9px] ml-2 animate-pulse">⏳ Sincronizando...</span>}
                          </p>
                          <p className="text-xs text-[#D4A017] font-bold uppercase tracking-wider">{ev.event_type} {ev.minute ? `- Min ${ev.minute}'` : ''}</p>
                        </div>
                      </div>
                      {partidoActivo.status !== 'finished' && !ev.id?.startsWith('offline') && (
                        <div className="flex gap-2">
                          <button onClick={() => setEditandoEventoId(ev.id)} className="text-[#D4A017] text-xs font-bold px-2 py-1 bg-[#D4A017]/10 rounded">Editar</button>
                          <button onClick={() => eliminarEvento(ev.id)} className="text-red-500 text-xs font-bold px-2 py-1 bg-red-900/20 rounded">Anular</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 1: CALENDARIO PRINCIPAL Y FORMULARIOS
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#2E2E2E] pb-4 gap-4">
        <h2 className="text-3xl font-black text-white uppercase tracking-wider">Programación de Fechas</h2>
        <div className="bg-[#1C1C1C] p-1 rounded-lg border border-[#2E2E2E] flex w-full md:w-auto">
          <button onClick={() => setModoProgramacion("manual")} className={`flex-1 md:flex-none px-4 py-2 rounded text-xs font-bold uppercase transition-all ${modoProgramacion === "manual" ? "bg-[#D4A017] text-black shadow-lg" : "text-gray-400 hover:text-white"}`}>Manual</button>
          <button onClick={() => setModoProgramacion("automatico")} className={`flex-1 md:flex-none px-4 py-2 rounded text-xs font-bold uppercase transition-all ${modoProgramacion === "automatico" ? "bg-[#2E2E2E] text-[#D4A017] border border-[#D4A017]/30 shadow-lg" : "text-gray-400 hover:text-white"}`}>⚡ Automático</button>
          <button onClick={() => setModoProgramacion("eliminatorias")} className={`flex-1 md:flex-none px-4 py-2 rounded text-xs font-bold uppercase transition-all ${modoProgramacion === "eliminatorias" ? "bg-gradient-to-r from-yellow-600 to-[#D4A017] text-black shadow-lg" : "text-gray-400 hover:text-white"}`}>🏆 Fases Finales</button>
        </div>
      </div>
      
      {/* ======================= FORMULARIOS ======================= */}
      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        
        {modoProgramacion === "manual" && (
          <form onSubmit={programarPartido} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Local</label><select value={localId} onChange={e => setLocalId(e.target.value)} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded"><option value="" disabled>Seleccionar...</option>{equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Visitante</label><select value={visitanteId} onChange={e => setVisitanteId(e.target.value)} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded"><option value="" disabled>Seleccionar...</option>{equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Instancia</label><select value={faseManual} onChange={e => setFaseManual(e.target.value)} className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded">{opcionesFase.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Jornada/Llave</label><input type="number" value={jornadaManual} onChange={e => setJornadaManual(Number(e.target.value))} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Cancha</label><input type="text" value={canchaManual} onChange={e => setCanchaManual(e.target.value)} className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" placeholder="Ej: Cancha 1" /></div>
            <div className="md:col-span-3"><label className="text-xs font-bold text-gray-500 uppercase">Fecha/Hora</label><input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
            <button type="submit" disabled={loading} className="md:col-span-2 py-3 bg-[#D4A017] text-black font-black uppercase rounded shadow-[0_0_15px_rgba(212,160,23,0.3)]">{loading ? "Guardando..." : "Programar"}</button>
          </form>
        )}

        {modoProgramacion === "automatico" && (
          <form onSubmit={generarFechaAutomatica} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-[#1C1C1C] p-6 border border-[#D4A017]/30 rounded-xl">
            <div className="md:col-span-6 flex items-center justify-between border-b border-[#2E2E2E] pb-3 mb-2">
              <h4 className="text-[#D4A017] font-black uppercase text-sm">Generador de Fase de Grupos / Liga</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={idaYVuelta} onChange={e => setIdaYVuelta(e.target.checked)} className="w-4 h-4 accent-[#D4A017]" />
                <span className="text-white font-bold text-xs uppercase">Torneo de Ida y Vuelta</span>
              </label>
            </div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Día a jugar</label><input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Hora de Inicio</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Duración (Min)</label><input type="number" value={autoDuracion} onChange={e => setAutoDuracion(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Número Fecha</label><input type="number" value={autoJornada} onChange={e => setAutoJornada(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Instancia</label><select value={autoFase} onChange={e => setAutoFase(e.target.value)} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded">{opcionesFase.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
            <button type="submit" disabled={loading} className="py-3 bg-[#D4A017] text-black font-black uppercase rounded shadow-[0_0_15px_rgba(212,160,23,0.4)] hover:bg-yellow-500 transition-all">⚡ Auto Generar</button>
          </form>
        )}

        {modoProgramacion === "eliminatorias" && (
          <div className="bg-[#1C1C1C] p-6 border border-yellow-600/50 rounded-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 border-b border-[#2E2E2E] pb-4">
              <h4 className="text-yellow-500 font-black uppercase text-xl mb-1">🏆 Generador Inteligente de Llaves</h4>
              <p className="text-gray-400 text-sm">El sistema extraerá la tabla de posiciones y armará los cruces matemáticamente (El 1ro vs el Peor Clasificado).</p>
            </div>
            
            <form onSubmit={generarLlavesAutomaticas} className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
               <div className="md:col-span-2">
                 <label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Formato de Llave</label>
                 <select value={formatoEliminatoria} onChange={e => setFormatoEliminatoria(e.target.value)} className="w-full p-3 mt-2 bg-[#141414] text-white border border-[#2E2E2E] rounded outline-none">
                   <option>Un Solo Partido (Playoff)</option>
                   <option>Ida y Vuelta (Estilo Libertadores)</option>
                 </select>
               </div>
               <div className="md:col-span-2">
                 <label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Fase a Generar</label>
                 <select value={faseGenerar} onChange={e => setFaseGenerar(e.target.value)} className="w-full p-3 mt-2 bg-[#141414] text-white border border-[#2E2E2E] rounded outline-none">
                   <option>Octavos de Final</option>
                   <option>Cuartos de Final</option>
                   <option>Semifinal</option>
                   <option>Final</option>
                 </select>
               </div>
               
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">Día a jugar</label><input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">Hora Inicio</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">Duración</label><input type="number" value={autoDuracion} onChange={e => setAutoDuracion(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">N° Fecha</label><input type="number" value={autoJornada} onChange={e => setAutoJornada(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>

               <div className="md:col-span-4">
                 <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black text-sm font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(212,160,23,0.3)] hover:scale-[1.01] transition-transform">
                   ⚡ {loading ? "Calculando..." : "Calcular Clasificados y Generar Llaves"}
                 </button>
               </div>
            </form>
          </div>
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
            
            {/* BOTÓN 1: COMPARTIR INVITACIÓN WHATSAPP */}
            <button onClick={compartirEnlaceInvitacion} className="bg-[#25D366]/10 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366] hover:text-black font-black uppercase text-xs px-4 py-2 rounded shadow-lg transition-all flex items-center gap-2">
              💬 Enviar Invitación
            </button>

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
                {p.stage !== 'Fase de Grupos' && (
                  <div className="absolute top-0 left-0 bg-[#D4A017] text-black text-[9px] font-black uppercase px-3 py-1 rounded-br-lg shadow-lg z-10">
                    {p.stage}
                  </div>
                )}
                
                <div className="flex-1 text-right font-bold text-white text-lg mt-4 md:mt-0 relative z-20">
                  <p className="text-[10px] text-gray-500 font-normal uppercase">Fecha {p.matchday} • {p.court || "Cancha 1"}</p>
                  <span className="uppercase tracking-wide">{p.home?.name}</span>
                </div>
                <div className="flex flex-col items-center px-4 w-48 relative z-20">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{new Date(p.match_date).toLocaleString('es-EC', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                  <div className="bg-[#0a0a0a] border border-[#2E2E2E] px-4 py-2 rounded-lg font-mono font-black text-xl text-[#D4A017] w-full text-center">
                    {p.status === 'finished' ? `${p.home_goals} - ${p.away_goals}` : "VS"}
                  </div>
                </div>
                <div className="flex-1 text-left font-bold text-white text-lg relative z-20 uppercase tracking-wide">{p.away?.name}</div>
                <div className="md:ml-4 relative z-20 flex flex-col md:flex-row gap-2">
                  
                  {/* BOTÓN 2: NOTIFICAR POR WHATSAPP (Solo si no ha terminado) */}
                  {p.status !== 'finished' && (
                    <button onClick={() => enviarRecordatorioWhatsApp(p)} className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-black border border-[#25D366]/50">
                      📲 Notificar
                    </button>
                  )}

                  <button onClick={() => abrirPartido(p)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${p.status === 'finished' ? 'bg-[#2E2E2E] text-gray-400 hover:text-white' : 'bg-[#D4A017] text-black hover:bg-yellow-500 shadow-[0_0_10px_rgba(212,160,23,0.3)]'}`}>
                    {p.status === 'finished' ? 'Ver Detalles' : 'Jugar Partido'}
                  </button>
                  {p.status !== 'finished' && (
                    <button onClick={() => eliminarPartido(p.id)} className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-900/50">
                      Eliminar
                    </button>
                  )}
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
          <div className="space-y-4 relative z-10">
            {partidosFiltrados.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#141414] border border-[#2e2e2e] rounded-full pr-6 pl-6 py-2 shadow-lg relative h-20">
                <div className="flex-1 flex items-center justify-end gap-4">
                  <span className="font-black text-white text-xl uppercase tracking-wider">{p.home?.name}</span>
                  {p.home?.shield_url ? <img src={p.home.shield_url} crossOrigin="anonymous" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 bg-[#2e2e2e] rounded-full"></div>}
                </div>
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
