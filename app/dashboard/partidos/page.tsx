"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import { calculateStandings, createKnockoutFixtures, createMatchdayFixtures, getQualifiedTeams, getStageWinners, getSuspendedPlayerIdsForMatch, normalizeTournamentConfig, scheduleFixtures, validateManualMatch, type TournamentConfig } from "@/lib/tournamentEngine";
import { offlineStore } from "@/lib/offlineStore"; // <-- IMPORTACIÓN DEL MODO OFFLINE

export default function PartidosPage() {
  const [torneoSlug, setTorneoSlug] = useState<string>("");
  const [torneoNombre, setTorneoNombre] = useState<string>("Torneo Oficial");
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [costoArbitraje, setCostoArbitraje] = useState<number>(20);
  const [pagosArbitraje, setPagosArbitraje] = useState<string[]>([]);
  
  const [partidos, setPartidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [configuracion, setConfiguracion] = useState<TournamentConfig>(normalizeTournamentConfig({}));

  // ESTADO OFFLINE
  const [isOffline, setIsOffline] = useState(false);

  // Tabs de Programación
  const [modoProgramacion, setModoProgramacion] = useState<"manual" | "automatico" | "eliminatorias">("manual");

  // Opciones de Fases
  const opcionesFase = ["Fase de Grupos", "16vos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Tercer Lugar", "Final"];

  // Estados Manuales, Automáticos, Eliminatorias y Filtros
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
  const bracketPosterRef = useRef<HTMLDivElement>(null);
  const [appUrl, setAppUrl] = useState("");
  const [fondoPosterUrl, setFondoPosterUrl] = useState("");
  const [usarFondoPersonalizado, setUsarFondoPersonalizado] = useState(true);

  const [partidoActivo, setPartidoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoTipo, setEventoTipo] = useState("gol");
  const [eventoJugador, setEventoJugador] = useState("");
  const [eventoMinuto, setEventoMinuto] = useState("");
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null);

  // ============================================================================
  // ESCUCHADOR DE RED (PLAN DE CONTINGENCIA OFFLINE MANTENIDO)
  // ============================================================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => {
        setIsOffline(false);
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

  const cargarDatos = async () => {
    let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
    if (!activeId) return;
    setTorneoId(activeId);

    const { data: tourney } = await supabase.from('tournaments').select('*').eq('id', activeId).single();
    if (tourney) {
      setCostoArbitraje(Number(tourney.referee_fee || 20));
      setTorneoNombre(tourney.name || "Torneo Oficial");
      setTorneoSlug(tourney.slug);
      const rules = normalizeTournamentConfig(tourney);
      setConfiguracion(rules);
      setAutoDuracion(rules.match_duration_minutes);
      setFondoPosterUrl(tourney.match_poster_background_url || "");
    }

    const { data: teamsData } = await supabase.from("teams").select("id, name, group_name").eq("tournament_id", activeId).order("name");
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
    const conflict = validateManualMatch({
      home_team_id: localId, away_team_id: visitanteId, match_date: fecha, court: canchaManual, stage: faseManual
    }, partidos, configuracion.match_duration_minutes);
    if (conflict) return alert(conflict);
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

  const generarFechaInteligente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDia || !torneoId) return alert("Selecciona el día de juego.");
    setLoading(true);
    try {
      const fixtures = createMatchdayFixtures(equipos, partidos, torneoId, autoJornada, autoFase);
      if (!fixtures.length) throw new Error("Esta jornada ya fue generada o no existen cruces válidos pendientes.");
      const matchesToInsert = scheduleFixtures(fixtures, autoDia, autoHoraInicio, { ...configuracion, match_duration_minutes: autoDuracion });
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      alert(`Fecha ${autoJornada} generada sin cruces duplicados y distribuida en ${configuracion.court_count} cancha(s).`);
      cargarDatos();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generarLlavesInteligentes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDia || !torneoId) return alert("Selecciona el día de juego.");
    setLoading(true);
    try {
      const required: Record<string, number> = { "16vos de Final": 32, "Octavos de Final": 16, "Cuartos de Final": 8, "Semifinal": 4, "Final": 2 };
      const count = required[faseGenerar] || 0;
      const previousStage: Record<string, string> = { "Octavos de Final": "16vos de Final", "Cuartos de Final": "Octavos de Final", "Semifinal": "Cuartos de Final", "Final": "Semifinal" };
      const previous = previousStage[faseGenerar];
      const winners = previous ? getStageWinners(partidos, equipos, previous) : [];
      const groups = calculateStandings(equipos, partidos.filter(p => p.stage === "Fase de Grupos"), [], configuracion);
      const qualified = (winners.length ? winners : getQualifiedTeams(groups)).slice(0, count);
      if (qualified.length < count) throw new Error(`Solo existen ${qualified.length} equipos clasificados según las reglas del torneo.`);
      const legs = faseGenerar === "Final" ? configuracion.final_legs : configuracion.knockout_legs;
      const fixtures = createKnockoutFixtures(qualified, torneoId, faseGenerar, autoJornada, legs);
      const duplicate = fixtures.some(f => partidos.some(p => p.stage === f.stage && [p.home_team_id, p.away_team_id].sort().join(":") === [f.home_team_id, f.away_team_id].sort().join(":")));
      if (duplicate) throw new Error("Las llaves de esta fase ya existen.");
      const matchesToInsert = scheduleFixtures(fixtures, autoDia, autoHoraInicio, { ...configuracion, match_duration_minutes: autoDuracion })
        .map(match => faseGenerar === "Final" && configuracion.final_venue ? { ...match, court: configuracion.final_venue } : match);
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      alert(`${faseGenerar} generada automáticamente con los equipos clasificados.`);
      cargarDatos();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FUNCIÓN CORREGIDA: GENERACIÓN DE HORARIOS AUTOMÁTICOS
  // ============================================================================
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
      // CORRECCIÓN: Parseo estricto local sin alterar el Timezone de manera errónea.
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
          // CORRECCIÓN: Se asigna la fecha y luego se suma la duración correctamente.
          matchesToInsert = tempMatches.map((match) => {
             const fechaAsignada = new Date(currentDate).toISOString();
             currentDate = new Date(currentDate.getTime() + autoDuracion * 60000);
             return { ...match, match_date: fechaAsignada };
          });
          exito = true;
        }
        maxIntentos--;
      }
      
      if (!exito) throw new Error("No se pudo generar. Equipos agotaron cruces posibles para este formato.");
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      
      alert(`¡Fecha ${autoJornada} generada con éxito!`); 
      cargarDatos();
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setLoading(false); 
    }
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
      // CORRECCIÓN HORARIA TAMBIÉN AQUÍ
      let currentDate = new Date(`${autoDia}T${autoHoraInicio}:00`);

      for (let i = 0; i < numEquipos / 2; i++) {
        const mejor = clasificados[i];
        const peor = clasificados[numEquipos - 1 - i];

        const fechaAsignadaIda = new Date(currentDate).toISOString();
        matchesToInsert.push({
          tournament_id: torneoId, home_team_id: mejor.id, away_team_id: peor.id,
          matchday: autoJornada, court: autoCancha, stage: faseGenerar, match_date: fechaAsignadaIda
        });
        currentDate = new Date(currentDate.getTime() + autoDuracion * 60000);

        if (formatoEliminatoria === "Ida y Vuelta (Estilo Libertadores)") {
           const fechaAsignadaVuelta = new Date(currentDate).toISOString();
           matchesToInsert.push({
             tournament_id: torneoId, home_team_id: peor.id, away_team_id: mejor.id,
             matchday: autoJornada + 1, court: autoCancha, stage: `${faseGenerar} (Vuelta)`, match_date: fechaAsignadaVuelta
           });
           currentDate = new Date(currentDate.getTime() + autoDuracion * 60000);
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

  // --- LÓGICA DE PARTIDO EN VIVO MANTENIDA ---
  const cargarConvocatoria = async (partido: any) => {
    const { data: playersData } = await supabase.from("players")
      .select("id, full_name, team_id, teams(name)")
      .in("team_id", [partido.home_team_id, partido.away_team_id])
      .order("full_name");
    const idsPartidos = partidos.map(p => p.id);
    const { data: cardEvents } = idsPartidos.length
      ? await supabase.from("match_events").select("match_id, player_id, team_id, event_type").in("match_id", idsPartidos).in("event_type", ["amarilla", "roja"])
      : { data: [] as any[] };
    const suspendidos = getSuspendedPlayerIdsForMatch(cardEvents || [], partidos, configuracion, partido);
    return {
      habilitados: (playersData || []).filter(player => !suspendidos.has(player.id)),
      suspendidos: (playersData || []).filter(player => suspendidos.has(player.id)),
    };
  };

  const abrirPartido = async (partido: any) => {
    setPartidoActivo(partido);
    const convocatoria = await cargarConvocatoria(partido);
    setJugadores(convocatoria.habilitados);
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
        setPagosArbitraje(prev => [...prev, teamId]);
        alert(`[MODO OFFLINE] Pago de $${costoArbitraje} guardado en el dispositivo. Se sincronizará en la nube al recuperar conexión.`);
      } else {
        const { error } = await supabase.from("payments").insert([pagoData]);
        if (error) throw error;
        alert(`Pago de $${costoArbitraje} enviado al Libro Mayor de Finanzas.`);
        cargarPagosArbitraje(partidoActivo.id);
      }
    } catch (error: any) { alert("Error contable: " + error.message); } finally { setLoading(false); }
  };

  const registrarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoJugador) return;
    const jugadorSel = jugadores.find(j => j.id === eventoJugador);
    
    const eventoData = { match_id: partidoActivo.id, player_id: jugadorSel.id, team_id: jugadorSel.team_id, event_type: eventoTipo, minute: eventoMinuto ? parseInt(eventoMinuto) : null };

    if (isOffline) {
      await offlineStore.guardarEventoOffline(eventoData);
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
    const update: any = { status: "finished", home_goals: golesLocal, away_goals: golesVisitante };
    const esEliminatoria = partidoActivo.stage !== "Fase de Grupos";
    const otrosLlave = partidos.filter(p => p.id !== partidoActivo.id && p.status === "finished" && esMismaLlave(p, partidoActivo));
    const globalLocal = golesLocal + otrosLlave.reduce((sum, p) => sum + Number(p.home_team_id === partidoActivo.home_team_id ? p.home_goals : p.away_goals), 0);
    const globalVisita = golesVisitante + otrosLlave.reduce((sum, p) => sum + Number(p.home_team_id === partidoActivo.away_team_id ? p.home_goals : p.away_goals), 0);
    if (esEliminatoria && globalLocal === globalVisita && window.confirm("La llave terminó empatada. ¿Registrar definición por penales?")) {
      const localPenales = Number(window.prompt(`Penales de ${partidoActivo.home?.name}`, "0"));
      const visitaPenales = Number(window.prompt(`Penales de ${partidoActivo.away?.name}`, "0"));
      if (Number.isFinite(localPenales) && Number.isFinite(visitaPenales) && localPenales !== visitaPenales) {
        update.resolved_by_penalties = true; update.home_penalties = localPenales; update.away_penalties = visitaPenales;
      }
    }
    await supabase.from("matches").update(update).eq("id", partidoActivo.id);
    setPartidoActivo(null); cargarDatos(); setLoading(false);
  };

  const registrarPenales = async (partido: any) => {
    const resultado = resultadoLlave(partido);
    if (resultado.home !== resultado.away) return alert("Solo se pueden registrar penales cuando el marcador global de la llave está empatado.");
    const local = Number(window.prompt(`Penales de ${partido.home?.name}`, String(partido.home_penalties ?? 0)));
    const visita = Number(window.prompt(`Penales de ${partido.away?.name}`, String(partido.away_penalties ?? 0)));
    if (!Number.isFinite(local) || !Number.isFinite(visita) || local === visita) return alert("El resultado de penales debe tener un ganador.");
    const { error } = await supabase.from("matches").update({ resolved_by_penalties: true, home_penalties: local, away_penalties: visita }).eq("id", partido.id);
    if (error) return alert("No se pudo registrar la definición por penales.");
    cargarDatos();
  };

  const descargarCalendario = async () => {
    if (!capturaRef.current) return; setLoading(true);
    try {
      capturaRef.current.style.display = "block";
      const canvas = await html2canvas(capturaRef.current, { backgroundColor: "#0a0a0a", scale: 2, useCORS: true });
      capturaRef.current.style.display = "none";
      const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `Póster_Calendario.png`; link.click();
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

  // ============================================================================
  // FUNCIÓN NUEVA: GENERAR E IMPRIMIR PLANILLA FÍSICA PDF/A4
  // ============================================================================
  const _imprimirPlanillaAnterior = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Por favor permite las ventanas emergentes (pop-ups) en tu navegador para imprimir.");
    
    const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <title>Planilla de Vocalía - GAME LEGAL PRO</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; display: flex; width: 100%; height: 100vh; box-sizing: border-box; color: #000; }
            .half { width: 50%; padding: 15px; border: 1px dashed #ccc; box-sizing: border-box; display: flex; flex-direction: column; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 3px 0; font-size: 10px; color: #555; }
            .match-info { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; font-weight: bold; }
            .teams { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 15px; text-align: center; font-weight: bold; }
            .table-container { display: flex; gap: 10px; flex: 1; }
            table { border-collapse: collapse; font-size: 10px; width: 100%; height: 100%; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; }
            th { background: #eee; font-weight: bold; }
            .signatures { margin-top: auto; display: flex; justify-content: space-between; padding-top: 35px; font-size: 11px; font-weight: bold; }
            .sig-line { border-top: 1px solid #000; width: 30%; text-align: center; padding-top: 5px; }
            .empty-row td { height: 16px; }
          </style>
        </head>
        <body>
          ${[1, 2].map(() => `
          <div class="half">
            <div class="header">
              <h2>PLANILLA DE JUEGO OFICIAL</h2>
              <p>SOFTWARE DE GESTIÓN DEPORTIVA - GAME-LEGAL PRO</p>
            </div>
            
            <div class="match-info">
              <span>Fecha/Jornada: __________________</span>
              <span>Hora: ________</span>
              <span>Cancha: __________________</span>
            </div>
            
            <div class="teams">
              <div style="width: 45%;">CLUB LOCAL:<br><br>____________________</div>
              <div style="width: 10%; margin-top: 15px;">VS</div>
              <div style="width: 45%;">CLUB VISITANTE:<br><br>____________________</div>
            </div>
            
            <div class="table-container">
              <table style="flex: 1;">
                <tr><th colspan="5">NOMINA LOCAL</th></tr>
                <tr><th width="15%">N°</th><th>Nombre del Jugador</th><th width="12%">⚽</th><th width="12%">🟨</th><th width="12%">🟥</th></tr>
                ${Array(15).fill('<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>').join('')}
              </table>
              
              <table style="flex: 1;">
                <tr><th colspan="5">NOMINA VISITANTE</th></tr>
                <tr><th width="15%">N°</th><th>Nombre del Jugador</th><th width="12%">⚽</th><th width="12%">🟨</th><th width="12%">🟥</th></tr>
                ${Array(15).fill('<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>').join('')}
              </table>
            </div>

            <div class="signatures">
              <div class="sig-line">Firma Cap. Local</div>
              <div class="sig-line">Firma Árbitro / Vocal</div>
              <div class="sig-line">Firma Cap. Visita</div>
            </div>
          </div>
          `).join('')}
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // El setTimeout garantiza que el navegador cargue los estilos CSS antes de lanzar la ventana de impresión
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const descargarCuadroEliminatorio = async () => {
    if (!bracketPosterRef.current) return;
    setLoading(true);
    try {
      const anchoCompleto = bracketPosterRef.current.scrollWidth;
      const canvas = await html2canvas(bracketPosterRef.current, { backgroundColor: "#07122d", scale: 2, useCORS: true, width: anchoCompleto, windowWidth: anchoCompleto });
      const socialCanvas = document.createElement("canvas");
      socialCanvas.width = 1080; socialCanvas.height = 1080;
      const context = socialCanvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar el póster");
      context.fillStyle = "#07122d"; context.fillRect(0, 0, 1080, 1080);
      const scale = Math.min(1040 / canvas.width, 1040 / canvas.height);
      const width = canvas.width * scale; const height = canvas.height * scale;
      context.drawImage(canvas, (1080 - width) / 2, (1080 - height) / 2, width, height);
      const link = document.createElement("a"); link.href = socialCanvas.toDataURL("image/png"); link.download = `Cuadro-Eliminatorio-${configuracion.tournament_year}.png`; link.click();
    } catch (error) {
      alert("No se pudo generar el póster eliminatorio.");
    } finally {
      setLoading(false);
    }
  };

  const imprimirPlanilla = async (partido: any, esEstandar = false) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Permite las ventanas emergentes para generar la planilla.");
    const { suspendidos } = esEstandar ? { suspendidos: [] as any[] } : await cargarConvocatoria(partido);
    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] || character));
    const fechaPartido = new Date(partido.match_date);
    const crearCasillas = () => Array.from({ length: configuracion.football_modality + configuracion.substitutes_count }, (_, index) => `<tr><td>${index + 1}</td><td>${index < configuracion.football_modality ? "T" : "S"}</td><td></td><td></td><td></td></tr>`).join("");
    const crearEquipo = (teamId: string, teamName: string) => {
      const suspendidosEquipo = suspendidos.filter(player => player.team_id === teamId);
      const suspendidosTexto = suspendidosEquipo.length
        ? suspendidosEquipo.map(player => escapeHtml(player.full_name)).join(", ")
        : esEstandar ? "________________________________________________" : "Ninguno";
      return `<div class="team"><h2>${escapeHtml(teamName)}</h2><div class="legend">T = Titular (${configuracion.football_modality}) · S = Suplente (${configuracion.substitutes_count})</div>
        <table><tr><th>N°</th><th>Rol</th><th>Jugador inscrito para esta fecha</th><th>Dorsal</th><th>Firma</th></tr>${crearCasillas()}</table>
        <div class="suspended"><b>No convocados automáticamente por suspensión:</b> ${suspendidosTexto}</div>
        <div class="observations"><b>Observaciones del equipo:</b></div></div>`;
    };
    const html = `<!DOCTYPE html><html lang="es"><head><title>Planilla oficial</title><style>
      @page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{font-family:Arial;color:#182033;margin:0;background:#fff}.sheet{min-height:281mm;padding:6mm;border:2px solid #d4a017}
      .brand{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #d4a017;padding-bottom:8px}.brand strong{display:block;font-size:18px;letter-spacing:2px}.brand span{font-size:9px;text-transform:uppercase;color:#657085}.year{font-size:22px;font-weight:900;color:#d4a017}
      h1{text-align:center;font-size:16px;text-transform:uppercase;margin:8px 0 2px}.subtitle{text-align:center;font-size:9px;color:#657085;text-transform:uppercase}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:8px 0;font-size:8px;background:#f4f5f7;padding:6px}.teams{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      h2{font-size:10px;text-align:center;text-transform:uppercase;background:#182033;color:#fff;padding:5px;margin:0}.legend{text-align:center;font-size:7px;padding:3px;background:#edf0f4}table{border-collapse:collapse;width:100%;font-size:7px}th,td{border:1px solid #9da4b1;padding:2px;height:14px}th{background:#edf0f4;text-transform:uppercase}.suspended{border-left:3px solid #b42318;background:#fff0ee;padding:5px;font-size:7px;margin-top:5px;min-height:28px}.observations{height:35px;border:1px solid #9da4b1;padding:5px;font-size:7px;margin-top:5px}.general{height:45px;border:1px solid #9da4b1;padding:6px;font-size:8px;margin-top:7px}.signatures{display:flex;justify-content:space-between;margin-top:22px}.signatures div{border-top:1px solid #182033;width:22%;text-align:center;padding-top:3px;font-size:7px;text-transform:uppercase}
    </style></head><body><section class="sheet">
      <div class="brand"><div><strong>GAME-LEGAL PRO</strong><span>Planilla abierta por partido</span></div><div class="year">${escapeHtml(configuracion.tournament_year)}</div></div>
      <h1>${escapeHtml(partido.home?.name)} vs ${escapeHtml(partido.away?.name)}</h1><div class="subtitle">Fútbol ${configuracion.football_modality} · Inscripción libre para esta fecha</div>
      <div class="meta"><span><b>Jornada:</b> ${escapeHtml(partido.matchday)}</span><span><b>Instancia:</b> ${escapeHtml(partido.stage)}</span><span><b>Cancha:</b> ${escapeHtml(partido.court || "Por confirmar")}</span><span><b>Fecha/hora:</b> ${esEstandar ? "________________" : fechaPartido.toLocaleString("es-EC")}</span></div>
      <div class="teams">${crearEquipo(partido.home_team_id, partido.home?.name)}${crearEquipo(partido.away_team_id, partido.away?.name)}</div>
      <div class="general"><b>Observaciones generales del partido:</b></div>
      <div class="signatures"><div>DT local</div><div>DT visitante</div><div>Árbitro</div><div>Vocal</div></div>
    </section></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const imprimirPlanillaEstandar = () => {
    const partidoVacio = {
      home_team_id: "", away_team_id: "", home: { name: "Equipo local: __________________" }, away: { name: "Equipo visitante: __________________" },
      matchday: "____", stage: "________________", court: "________________", match_date: new Date().toISOString(),
    };
    imprimirPlanilla(partidoVacio, true);
  };

  const compartirEnlaceInvitacion = () => {
    const enlaceOficial = `${appUrl}/torneo/${torneoSlug}`;
    const mensaje = `🏆 *¡TE INVITAMOS A SEGUIR EL TORNEO EN VIVO!* 🏆\n\nRevisa el calendario oficial, resultados y el minuto a minuto de los partidos directamente desde nuestra plataforma:\n\n🔗 *Enlace Oficial:*\n${enlaceOficial}\n\n¡No te lo pierdas! ⚽🔥`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const enviarRecordatorioWhatsApp = (p: any) => {
    const enlaceOficial = `${appUrl}/torneo/${torneoSlug}`;
    const fechaObj = new Date(p.match_date);
    const fechaFormateada = fechaObj.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    const horaFormateada = fechaObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute:'2-digit' });

    const mensaje = `🏆 *¡RECORDATORIO DE PARTIDO!* 🏆\n\n⚽ *${p.home?.name}* vs *${p.away?.name}*\n📅 *Fecha:* ${fechaFormateada}\n⏰ *Hora:* ${horaFormateada}\n🏟️ *Lugar:* ${p.court || "Cancha 1"}\n📍 *Instancia:* ${p.stage}\n\n🔗 *Sigue el partido en vivo aquí:*\n${enlaceOficial}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const partidosFiltrados = filtroJornada ? partidos.filter(p => p.matchday === filtroJornada) : partidos;
  const fasesCuadro = ["16vos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Final"];
  const fasesVisibles = fasesCuadro.filter(fase => partidos.some(partido => partido.stage === fase || partido.stage === `${fase} (Vuelta)`));
  const faseBase = (stage: string) => String(stage || "").replace(" (Vuelta)", "");
  const esMismaLlave = (a: any, b: any) =>
    faseBase(a.stage) === faseBase(b.stage) &&
    [a.home_team_id, a.away_team_id].sort().join(":") === [b.home_team_id, b.away_team_id].sort().join(":");
  const resultadoLlave = (partido: any) => {
    const llave = partidos.filter(p => p.status === "finished" && esMismaLlave(p, partido));
    const home = llave.reduce((sum, p) => sum + Number(p.home_team_id === partido.home_team_id ? p.home_goals : p.away_goals), 0);
    const away = llave.reduce((sum, p) => sum + Number(p.home_team_id === partido.away_team_id ? p.home_goals : p.away_goals), 0);
    const penalties = llave.find(p => p.resolved_by_penalties);
    const homePenalties = penalties ? Number(penalties.home_team_id === partido.home_team_id ? penalties.home_penalties : penalties.away_penalties) : null;
    const awayPenalties = penalties ? Number(penalties.home_team_id === partido.away_team_id ? penalties.home_penalties : penalties.away_penalties) : null;
    return { home, away, homePenalties, awayPenalties };
  };

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
          <form onSubmit={generarFechaInteligente} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-[#1C1C1C] p-6 border border-[#D4A017]/30 rounded-xl">
            <div className="md:col-span-6 flex items-center justify-between border-b border-[#2E2E2E] pb-3 mb-2">
              <h4 className="text-[#D4A017] font-black uppercase text-sm">Generador de Fase de Grupos / Liga</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={idaYVuelta} onChange={e => setIdaYVuelta(e.target.checked)} className="w-4 h-4 accent-[#D4A017]" />
                <span className="text-white font-bold text-xs uppercase">Torneo de Ida y Vuelta</span>
              </label>
            </div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Día a jugar</label><input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Hora de Inicio</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Duración + descanso</label><div className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded">{configuracion.match_duration_minutes} + {configuracion.break_between_matches_minutes} min</div></div>
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
            
            <form onSubmit={generarLlavesInteligentes} className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
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
                   <option>16vos de Final</option>
                   <option>Octavos de Final</option>
                   <option>Cuartos de Final</option>
                   <option>Semifinal</option>
                   <option>Final</option>
                 </select>
               </div>
               
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">Día a jugar</label><input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">Hora Inicio</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" style={{ colorScheme: 'dark' }} /></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">Duración + descanso</label><div className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded">{configuracion.match_duration_minutes} + {configuracion.break_between_matches_minutes} min</div></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">N° Fecha</label><input type="number" value={autoJornada} onChange={e => setAutoJornada(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>

               <div className="md:col-span-4">
                 <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black text-sm font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(212,160,23,0.3)] hover:scale-[1.01] transition-transform">
                   ⚡ {loading ? "Calculando..." : "Calcular Clasificados y Generar Llaves"}
                 </button>
               </div>
            </form>

            {fasesVisibles.length > 0 && (
              <div ref={bracketPosterRef} className="relative z-10 rounded-2xl border border-blue-400/30 bg-gradient-to-b from-[#081a46] via-[#07122d] to-[#050914] p-5 overflow-x-auto" style={fondoPosterUrl && usarFondoPersonalizado ? { backgroundImage: `linear-gradient(rgba(4,12,38,.82), rgba(4,12,38,.94)), url("${fondoPosterUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                <div className="text-center mb-7">
                  <p className="text-blue-300 text-[10px] uppercase tracking-[0.35em] font-black">Cuadro eliminatorio oficial</p>
                  <h3 className="text-white text-2xl font-black uppercase mt-2">{torneoNombre} · {configuracion.tournament_year}</h3>
                  <p className="text-[#D4A017] text-xs font-bold uppercase mt-1">Final · {configuracion.final_venue || "Cancha por confirmar"}</p>
                  <button data-html2canvas-ignore onClick={descargarCuadroEliminatorio} disabled={loading} className="mt-4 px-5 py-2 rounded-lg bg-blue-500 text-white font-black uppercase text-[10px] hover:bg-blue-400">Descargar póster del cuadro</button>
                </div>
                <div className="flex min-w-max items-stretch justify-center gap-8 pb-3">
                  {fasesVisibles.map((fase, faseIndex) => {
                    const partidosFase = partidos.filter(partido => partido.stage === fase || partido.stage === `${fase} (Vuelta)`);
                    return (
                      <div key={fase} className="w-60 flex flex-col">
                        <div className="text-center text-blue-200 font-black uppercase tracking-widest text-[10px] mb-4">{fase}</div>
                        <div className="flex-1 flex flex-col justify-around gap-4">
                          {partidosFase.map(partido => (
                            <button key={partido.id} onClick={() => abrirPartido(partido)} className="relative text-left rounded-xl border border-blue-300/30 bg-white/10 hover:bg-white/20 hover:border-[#D4A017] p-3 shadow-[0_0_25px_rgba(37,99,235,.15)] transition-all group">
                              {faseIndex < fasesVisibles.length - 1 && <span className="absolute top-1/2 -right-9 w-9 border-t border-blue-300/40" />}
                              {[["home", partido.home, partido.home_goals], ["away", partido.away, partido.away_goals]].map(([lado, equipo, goles]: any) => (
                                <div key={lado} className="flex items-center gap-2 py-1">
                                  {equipo?.shield_url ? <Image src={equipo.shield_url} alt="" width={22} height={22} unoptimized crossOrigin="anonymous" className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 rounded-full bg-blue-300/20" />}
                                  <span className="flex-1 text-white text-[10px] font-black uppercase truncate">{equipo?.name || "Por definir"}</span>
                                  <span className="text-[#D4A017] font-black text-xs">{partido.status === "finished" ? goles : "-"}</span>
                                </div>
                              ))}
                              {partido.status === "finished" && (() => {
                                const resultado = resultadoLlave(partido);
                                return <div className="text-[8px] text-[#D4A017] font-black uppercase mt-1">Global {resultado.home}-{resultado.away}{resultado.homePenalties !== null ? ` · Penales ${resultado.homePenalties}-${resultado.awayPenalties}` : ""}</div>;
                              })()}
                              <div className="border-t border-white/10 mt-1 pt-1 text-[8px] text-blue-200 uppercase">{partido.court || "Cancha por confirmar"} · {new Date(partido.match_date).toLocaleDateString("es-EC")}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-center text-blue-200/60 text-[9px] uppercase tracking-widest mt-4">Selecciona una llave para abrir su gestión y detalles</p>
              </div>
            )}
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
            
            {/* BOTÓN WHATSAPP */}
            <button onClick={compartirEnlaceInvitacion} className="bg-[#25D366]/10 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366] hover:text-black font-black uppercase text-xs px-4 py-2 rounded shadow-lg transition-all flex items-center gap-2">
              💬 Invitación
            </button>

            {/* BOTÓN POSTER */}
            <button onClick={descargarCalendario} disabled={loading || partidosFiltrados.length === 0} className="bg-transparent border border-[#D4A017] text-[#D4A017] hover:bg-[#D4A017] hover:text-black font-black uppercase text-xs px-4 py-2 rounded shadow-lg transition-all flex items-center gap-2">
              📸 Póster
            </button>
            <button onClick={imprimirPlanillaEstandar} className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700 font-black uppercase text-xs px-4 py-2 rounded shadow-lg transition-all">
              Planilla estándar
            </button>
            {fondoPosterUrl && (
              <label className="flex items-center gap-2 text-[10px] text-gray-300 font-bold uppercase">
                <input type="checkbox" checked={usarFondoPersonalizado} onChange={e => setUsarFondoPersonalizado(e.target.checked)} className="accent-[#D4A017]" />
                Usar fondo personalizado
              </label>
            )}
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
                  
                  {p.status !== 'finished' && (
                    <button onClick={() => enviarRecordatorioWhatsApp(p)} className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-black border border-[#25D366]/50">
                      📲 Notificar
                    </button>
                  )}
                  <button onClick={() => imprimirPlanilla(p)} className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all bg-gray-800 text-white hover:bg-gray-700 border border-gray-600">
                    Planilla abierta
                  </button>
                  {p.status === "finished" && p.stage !== "Fase de Grupos" && (
                    <button onClick={() => registrarPenales(p)} className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all bg-blue-950 text-blue-300 hover:bg-blue-800 border border-blue-700">
                      Penales
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
          📸 LIENZO DE CAPTURA ORIGINAL "GAME-LEGAL PRO" MANTENIDO INTACTO
          ============================================================================== */}
      <div style={{ display: "none" }} ref={capturaRef}>
        <div
          className="bg-[#0a0a0a] p-10 w-[800px] font-sans relative overflow-hidden border-8 border-[#D4A017]"
          style={fondoPosterUrl && usarFondoPersonalizado ? { backgroundImage: `linear-gradient(rgba(10,10,10,.78), rgba(10,10,10,.9)), url("${fondoPosterUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
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
                  {p.home?.shield_url ? <Image src={p.home.shield_url} alt={`Escudo de ${p.home.name}`} width={56} height={56} unoptimized crossOrigin="anonymous" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 bg-[#2e2e2e] rounded-full"></div>}
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
                  {p.away?.shield_url ? <Image src={p.away.shield_url} alt={`Escudo de ${p.away.name}`} width={56} height={56} unoptimized crossOrigin="anonymous" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 bg-[#2e2e2e] rounded-full"></div>}
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
