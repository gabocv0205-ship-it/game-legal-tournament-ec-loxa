"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, Clock3, Copy, MapPin, Plus } from "lucide-react";
import { calculateStandings, createDrawKnockoutFixtures, createGroupSequenceKnockoutFixtures, createKnockoutFixtures, createMatchdayFixtures, getQualifiedTeams, getStageWinners, getSuspensionInfoForMatch, normalizeTournamentConfig, validateManualMatch, type TournamentConfig } from "@/lib/tournamentEngine";
import { offlineStore } from "@/lib/offlineStore"; // <-- IMPORTACIÓN DEL MODO OFFLINE

import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";

type JornadaWindow = {
  day: string;
  startTime: string;
  endTime: string;
};

type ManualMatchDraft = {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  matchday: number;
  court: string;
  stage: string;
  notes: string | null;
  home_name: string;
  away_name: string;
};

export default function PartidosPage() {
  const [torneoSlug, setTorneoSlug] = useState<string>("");
  const [torneoNombre, setTorneoNombre] = useState<string>("Torneo Oficial");
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [costoArbitraje, setCostoArbitraje] = useState<number>(20);
  const [costosFinancieros, setCostosFinancieros] = useState({ inscripcion: 150, arbitraje: 20, amarilla: 2, roja: 5 });
  const [pagosArbitraje, setPagosArbitraje] = useState<string[]>([]);
  const [auspiciantesTorneo, setAuspiciantesTorneo] = useState<string[]>([]);
  
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
  const [grupoManual, setGrupoManual] = useState("Todos");
  const [manualEsVuelta, setManualEsVuelta] = useState(false);
  const [observacionesManual, setObservacionesManual] = useState("");
  const [manualPendientes, setManualPendientes] = useState<ManualMatchDraft[]>([]);
  const [partidoEditando, setPartidoEditando] = useState<any>(null);
  const [editLocalId, setEditLocalId] = useState("");
  const [editVisitanteId, setEditVisitanteId] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [editJornada, setEditJornada] = useState<number>(1);
  const [editCancha, setEditCancha] = useState("");
  const [editFase, setEditFase] = useState("Fase de Grupos");
  const [editNotas, setEditNotas] = useState("");

  const [autoJornada, setAutoJornada] = useState<number>(1);
  const [autoDia, setAutoDia] = useState("");
  const [autoDias, setAutoDias] = useState<string[]>([]);
  const [autoVentanas, setAutoVentanas] = useState<JornadaWindow[]>([]);
  const [autoHoraInicio, setAutoHoraInicio] = useState("09:30");
  const [autoHoraFin, setAutoHoraFin] = useState("17:00");
  const [autoIntervalo, setAutoIntervalo] = useState<number>(60);
  const [autoDuracion, setAutoDuracion] = useState<number>(60);
  const [autoCancha, setAutoCancha] = useState("Cancha 1");
  const [autoFase, setAutoFase] = useState("Fase de Grupos");
  const [idaYVuelta, setIdaYVuelta] = useState<boolean>(false);

  const [formatoEliminatoria, setFormatoEliminatoria] = useState("Un Solo Partido (Playoff)");
  const [faseGenerar, setFaseGenerar] = useState("Cuartos de Final");

  const [filtroJornada, setFiltroJornada] = useState<number | "">("");
  const capturaRef = useRef<HTMLDivElement>(null);
  const jornadaPosterRef = useRef<HTMLDivElement>(null);
  const bracketPosterRef = useRef<HTMLDivElement>(null);
  const [appUrl, setAppUrl] = useState("");
  const [fondoPosterUrl, setFondoPosterUrl] = useState("");
  const [usarFondoPersonalizado, setUsarFondoPersonalizado] = useState(true);
  const posterFontFamily = '"Segoe UI", Arial, Helvetica, sans-serif';

  const [partidoActivo, setPartidoActivo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoTipo, setEventoTipo] = useState("gol");
  const [eventoJugador, setEventoJugador] = useState("");
  const [eventoMinuto, setEventoMinuto] = useState("");
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null);
  const [observacionesPartido, setObservacionesPartido] = useState("");

  const obtenerFechaHoraEcuador = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date()).reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
    const dia = `${parts.year}-${parts.month}-${parts.day}`;
    const hora = `${parts.hour}:${parts.minute}`;
    return { dia, hora, fechaHora: `${dia}T${hora}` };
  };

  const aplicarFechaHoraEcuador = () => {
    const ahora = obtenerFechaHoraEcuador();
    setFecha(ahora.fechaHora);
    setAutoDia(ahora.dia);
    setAutoDias(dias => dias.length ? dias : [ahora.dia]);
    setAutoHoraInicio(ahora.hora);
    setAutoVentanas(ventanas => ventanas.length ? ventanas : [{ day: ahora.dia, startTime: ahora.hora, endTime: "17:00" }]);
  };

  const fechaHoraEcuadorAISO = (value: string) => {
    if (!value) return value;
    return new Date(`${value.length === 16 ? `${value}:00` : value}-05:00`).toISOString();
  };

  const obtenerDiaDeCampo = (value: string) => (value || obtenerFechaHoraEcuador().fechaHora).split("T")[0] || obtenerFechaHoraEcuador().dia;
  const obtenerHoraDeCampo = (value: string) => (value || obtenerFechaHoraEcuador().fechaHora).split("T")[1] || obtenerFechaHoraEcuador().hora;
  const actualizarFechaHoraCampo = (value: string, tipo: "dia" | "hora", nuevoValor: string) => {
    const ahora = obtenerFechaHoraEcuador();
    const [diaActual, horaActual] = (value || ahora.fechaHora).split("T");
    return tipo === "dia"
      ? `${nuevoValor}T${horaActual || ahora.hora}`
      : `${diaActual || ahora.dia}T${nuevoValor}`;
  };

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
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
      const ahora = obtenerFechaHoraEcuador();
      setFecha(valor => valor || ahora.fechaHora);
      setAutoDia(valor => valor || ahora.dia);
      setAutoDias(valor => valor.length ? valor : [ahora.dia]);
      setAutoHoraInicio(valor => valor || ahora.hora);
      setAutoVentanas(valor => valor.length ? valor : [{ day: ahora.dia, startTime: "09:30", endTime: "17:00" }]);
    }
  }, []);

  const cargarDatos = async () => {
    let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
    if (!activeId) return;

    const tourney = await getAccessibleTournament(supabase, activeId);
    if (!tourney) {
      clearActiveTournament();
      setTorneoId(null);
      setEquipos([]);
      setPartidos([]);
      return;
    }

    setTorneoId(activeId);
    if (tourney) {
      setCostoArbitraje(Number(tourney.referee_fee || 20));
      setCostosFinancieros({
        inscripcion: Number(tourney.registration_fee || 150),
        arbitraje: Number(tourney.referee_fee || 20),
        amarilla: Number(tourney.yellow_card_fee || 2),
        roja: Number(tourney.red_card_fee || 5),
      });
      setTorneoNombre(tourney.name || "Torneo Oficial");
      setTorneoSlug(tourney.slug);
      setAuspiciantesTorneo(Array.isArray(tourney.tournament_sponsors) ? tourney.tournament_sponsors.filter(Boolean) : []);
      const rules = normalizeTournamentConfig(tourney);
      setConfiguracion(rules);
      setIdaYVuelta(["sudamericana", "libertadores", "champions", "europa_league"].includes(rules.format));
      setAutoDuracion(rules.match_duration_minutes);
      setFondoPosterUrl(tourney.match_poster_background_url || "");
    }

    const teamsAdvanced = await supabase.from("teams").select("id, name, group_name, competition_status, competition_status_reason").eq("tournament_id", activeId).order("name");
    if (teamsAdvanced.error) {
      const { data: teamsBasic } = await supabase.from("teams").select("id, name, group_name").eq("tournament_id", activeId).order("name");
      setEquipos((teamsBasic || []).map(team => ({ ...team, competition_status: "active", competition_status_reason: null })));
    } else {
      setEquipos(teamsAdvanced.data || []);
    }

    const matchesAdvanced = await supabase.from("matches")
      .select("*, home:home_team_id(name, shield_url, competition_status, competition_status_reason), away:away_team_id(name, shield_url, competition_status, competition_status_reason)")
      .eq("tournament_id", activeId).order("match_date", { ascending: true });
    if (matchesAdvanced.error) {
      const { data: matchesBasic } = await supabase.from("matches")
        .select("*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)")
        .eq("tournament_id", activeId).order("match_date", { ascending: true });
      setPartidos(matchesBasic || []);
    } else {
      setPartidos(matchesAdvanced.data || []);
    }
  };

  const mismaJornada = (partido: any, jornada: number, fase: string) => Number(partido.matchday) === Number(jornada) && partido.stage === fase;
  const jornadaTienePartidos = (jornada: number, fase: string) => partidos.some(partido => mismaJornada(partido, jornada, fase));
  const jornadaCulminada = (jornada: number, fase: string) => partidos.some(partido => mismaJornada(partido, jornada, fase) && partido.status === "finished");
  const faseBase = (fase: string) => String(fase || "").replace(/\s+\(Vuelta\)$/i, "");
  const equipoActivo = (equipo: any) => !["suspended", "eliminated"].includes(String(equipo?.competition_status || "active"));
  const equiposActivos = () => equipos.filter(equipoActivo);
  const sedesConfiguradas = () => String(configuracion.final_venue || "")
    .split(/\r?\n|;/)
    .map(sede => sede.trim())
    .filter(Boolean);
  const canchasProgramacion = () => {
    const sedes = sedesConfiguradas();
    if (sedes.length > 1) return sedes;
    const sedeBase = sedes[0] || "";
    return Array.from({ length: Math.max(1, configuracion.court_count) }, (_, index) =>
      sedeBase ? `${sedeBase} - Cancha ${index + 1}` : `Cancha ${index + 1}`
    );
  };
  const sedePrincipalProgramacion = () => canchasProgramacion()[0] || "Cancha por confirmar";
  const maxCrucesPorFase = (fase: string) => {
    const base = faseBase(fase);
    if (base === "Fase de Grupos") return idaYVuelta ? 2 : 1;
    if (base === "Final") return configuracion.final_legs;
    return configuracion.knockout_legs;
  };
  const validarJornadaGenerable = (jornada: number, fase: string) => {
    if (jornadaCulminada(jornada, fase)) return `La fecha ${jornada} de ${fase} ya esta culminada y no puede volver a generarse.`;
    if (jornadaTienePartidos(jornada, fase)) return `La fecha ${jornada} de ${fase} ya tiene partidos guardados. Puedes editarlos, no volver a generarlos.`;
    return "";
  };

  const agregarDiaAutomatico = () => {
    if (!autoDia) return alert("Selecciona una fecha desde el calendario.");
    setAutoDias(dias => [...new Set([...dias, autoDia])].sort());
    setAutoVentanas(ventanas => {
      if (ventanas.some(ventana => ventana.day === autoDia)) return ventanas;
      return [...ventanas, { day: autoDia, startTime: autoHoraInicio, endTime: autoHoraFin }].sort((a, b) => a.day.localeCompare(b.day));
    });
  };

  const quitarDiaAutomatico = (dia: string) => {
    setAutoDias(dias => dias.filter(item => item !== dia));
    setAutoVentanas(ventanas => ventanas.filter(ventana => ventana.day !== dia));
  };

  const actualizarVentanaJornada = (index: number, key: keyof JornadaWindow, value: string) => {
    setAutoVentanas(ventanas => ventanas
      .map((ventana, current) => current === index ? { ...ventana, [key]: value } : ventana)
      .sort((a, b) => a.day.localeCompare(b.day))
    );
  };

  const obtenerVentanasJornada = () => {
    const ventanas = autoVentanas.length
      ? autoVentanas
      : (autoDias.length ? autoDias : autoDia ? [autoDia] : []).map(day => ({ day, startTime: autoHoraInicio, endTime: autoHoraFin }));
    const normalizadas = ventanas
      .filter(ventana => ventana.day && ventana.startTime && ventana.endTime)
      .sort((a, b) => `${a.day} ${a.startTime}`.localeCompare(`${b.day} ${b.startTime}`));
    if (!normalizadas.length) throw new Error("Selecciona al menos una ventana de jornada.");
    return normalizadas;
  };

  const crearSlotsJornada = () => {
    const intervalo = Math.max(1, Number(autoIntervalo || autoDuracion || configuracion.match_duration_minutes));

    return obtenerVentanasJornada().flatMap(ventana => {
      const [inicioHora, inicioMinuto] = ventana.startTime.split(":").map(Number);
      const [finHora, finMinuto] = ventana.endTime.split(":").map(Number);
      const inicioMinutos = inicioHora * 60 + inicioMinuto;
      const finMinutos = finHora * 60 + finMinuto;
      if (finMinutos < inicioMinutos) throw new Error(`La hora final de ${ventana.day} debe ser igual o posterior a la hora inicial.`);
      const slots: Date[] = [];
      for (let minuto = inicioMinutos; minuto <= finMinutos; minuto += intervalo) {
        const hora = String(Math.floor(minuto / 60)).padStart(2, "0");
        const min = String(minuto % 60).padStart(2, "0");
        slots.push(new Date(`${ventana.day}T${hora}:${min}:00-05:00`));
      }
      return slots;
    });
  };

  const distribuirPartidosEnHorarios = (fixtures: any[]) => {
    const slots = crearSlotsJornada();
    const canchas = canchasProgramacion();
    const capacidad = slots.length * canchas.length;
    if (fixtures.length > capacidad) {
      throw new Error(`El rango horario configurado es insuficiente. Hay ${capacidad} cupo(s) disponible(s) y ${fixtures.length} partido(s) por programar.`);
    }
    const programados = fixtures.map((fixture, index) => {
      const slot = slots[Math.floor(index / canchas.length)];
      const cancha = canchas[index % canchas.length];
      return { ...fixture, court: cancha, match_date: slot.toISOString() };
    });
    const revisados: any[] = [];
    for (const partido of programados) {
      const conflict = validateManualMatch(partido, [...partidos, ...revisados], configuracion.match_duration_minutes, { maxLegs: maxCrucesPorFase(partido.stage) });
      if (conflict) throw new Error(conflict);
      revisados.push(partido);
    }
    return programados;
  };

  const programarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localId === visitanteId) return alert("Un equipo no puede jugar contra sí mismo.");
    if (!torneoId) return alert("No hay torneo activo.");
    const localEstado = equipos.find(equipo => equipo.id === localId);
    const visitanteEstado = equipos.find(equipo => equipo.id === visitanteId);
    if (!equipoActivo(localEstado) || !equipoActivo(visitanteEstado)) return alert("Uno de los equipos esta suspendido o eliminado. Reactivalo antes de programar un nuevo partido.");
    const fasePartidoManual = manualEsVuelta ? `${faseBase(faseManual)} (Vuelta)` : faseBase(faseManual);
    if (manualEsVuelta && maxCrucesPorFase(faseManual) < 2) return alert("Este torneo no esta configurado para ida y vuelta en esta fase.");
    if (jornadaCulminada(jornadaManual, fasePartidoManual)) return alert(`La fecha ${jornadaManual} de ${fasePartidoManual} ya esta culminada. Crea una nueva fecha o edita otra jornada abierta.`);
    if (faseBase(fasePartidoManual) === "Fase de Grupos") {
      const local = equipos.find(equipo => equipo.id === localId);
      const visitante = equipos.find(equipo => equipo.id === visitanteId);
      if ((local?.group_name || "General") !== (visitante?.group_name || "General")) {
        return alert("En fase de grupos solo pueden enfrentarse equipos del mismo grupo.");
      }
    }
    const fechaISO = fechaHoraEcuadorAISO(fecha);
    const primeraPendiente = manualPendientes[0];
    if (primeraPendiente && (Number(primeraPendiente.matchday) !== Number(jornadaManual) || faseBase(primeraPendiente.stage) !== faseBase(fasePartidoManual))) {
      return alert("La jornada manual pendiente debe mantener el mismo numero de fecha e instancia. Guarda o limpia la lista antes de cambiar de jornada.");
    }
    const local = equipos.find(equipo => equipo.id === localId);
    const visitante = equipos.find(equipo => equipo.id === visitanteId);
    const draft: ManualMatchDraft = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tournament_id: torneoId,
      home_team_id: localId,
      away_team_id: visitanteId,
      match_date: fechaISO,
      matchday: Number(jornadaManual),
      court: canchaManual.trim() || "Cancha 1",
      stage: fasePartidoManual,
      notes: observacionesManual.trim() || null,
      home_name: local?.name || "Local",
      away_name: visitante?.name || "Visitante"
    };
    const conflict = validateManualMatch(draft, [...partidos, ...manualPendientes], configuracion.match_duration_minutes, { maxLegs: maxCrucesPorFase(fasePartidoManual) });
    if (conflict) return alert(conflict);
    setManualPendientes(pendientes => [...pendientes, draft].sort((a, b) => String(a.match_date).localeCompare(String(b.match_date))));
    setLocalId("");
    setVisitanteId("");
    setObservacionesManual("");
    setManualEsVuelta(false);
  };

  const quitarPartidoManualPendiente = (id: string) => {
    setManualPendientes(pendientes => pendientes.filter(partido => partido.id !== id));
  };

  const guardarJornadaManual = async () => {
    if (!torneoId) return alert("No hay torneo activo.");
    if (!manualPendientes.length) return alert("Agrega al menos un partido a la jornada manual.");
    setLoading(true);
    try {
      const matchesToInsert = manualPendientes.map(({ id, home_name, away_name, ...partido }) => partido);
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      setManualPendientes([]);
      setLocalId(""); setVisitanteId(""); setFecha(""); setObservacionesManual(""); setManualEsVuelta(false);
      alert(`Jornada manual guardada con ${matchesToInsert.length} partido(s).`);
      cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  const generarFechaInteligente = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!autoVentanas.length && !autoDias.length && !autoDia) || !torneoId) return alert("Selecciona al menos una ventana de jornada.");
    setLoading(true);
    try {
      if (autoFase !== "Fase de Grupos") throw new Error("Para eliminatorias usa el generador inteligente de llaves.");
      const bloqueo = validarJornadaGenerable(autoJornada, autoFase);
      if (bloqueo) throw new Error(bloqueo);
      const equiposDisponibles = equiposActivos();
      if (equiposDisponibles.length < 2) throw new Error("No hay suficientes equipos activos para generar partidos. Revisa que los equipos esten registrados y habilitados.");
      const fixtures = createMatchdayFixtures(equiposDisponibles, partidos, torneoId, autoJornada, autoFase, { legs: idaYVuelta ? 2 : 1 });
      if (!fixtures.length) throw new Error("Esta jornada ya fue generada o no existen cruces válidos pendientes.");
      const matchesToInsert = distribuirPartidosEnHorarios(fixtures);
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      alert(`Fecha ${autoJornada} generada por grupos, sin cruces duplicados y distribuida en ${canchasProgramacion().length} sede/cancha(s).`);
      cargarDatos();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generarLlavesInteligentes = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!autoVentanas.length && !autoDias.length && !autoDia) || !torneoId) return alert("Selecciona al menos una ventana de jornada.");
    setLoading(true);
    try {
      const bloqueo = validarJornadaGenerable(autoJornada, faseGenerar);
      if (bloqueo) throw new Error(bloqueo);
      const required: Record<string, number> = { "16vos de Final": 32, "Octavos de Final": 16, "Cuartos de Final": 8, "Semifinal": 4, "Final": 2 };
      const count = required[faseGenerar] || 0;
      const previousStage: Record<string, string> = { "Octavos de Final": "16vos de Final", "Cuartos de Final": "Octavos de Final", "Semifinal": "Cuartos de Final", "Final": "Semifinal" };
      const previous = previousStage[faseGenerar];
      const winners = previous ? getStageWinners(partidos, equiposActivos(), previous) : [];
      const groups = calculateStandings(equiposActivos(), partidos.filter(p => p.stage === "Fase de Grupos"), [], configuracion);
      const qualified = (winners.length ? winners : getQualifiedTeams(groups)).slice(0, count);
      if (qualified.length < count) throw new Error(`Solo existen ${qualified.length} equipos clasificados según las reglas del torneo.`);
      const legs = faseGenerar === "Final" ? configuracion.final_legs : configuracion.knockout_legs;
      if (configuracion.knockout_pairing_mode === "manual" && !winners.length) {
        throw new Error("La configuracion del torneo esta en cruces manuales. Usa el modo Manual para agregar cada cruce de esta fase.");
      }
      const fixtures = configuracion.knockout_pairing_mode === "group_cross" && !winners.length
        ? createGroupSequenceKnockoutFixtures(groups, torneoId, faseGenerar, autoJornada, legs).slice(0, legs === 2 ? count : count / 2)
        : createKnockoutFixtures(qualified, torneoId, faseGenerar, autoJornada, legs);
      const duplicate = fixtures.some(f => partidos.some(p => p.stage === f.stage && [p.home_team_id, p.away_team_id].sort().join(":") === [f.home_team_id, f.away_team_id].sort().join(":")));
      if (duplicate) throw new Error("Las llaves de esta fase ya existen.");
      const matchesToInsert = distribuirPartidosEnHorarios(fixtures)
        .map(match => faseGenerar === "Final" ? { ...match, court: sedePrincipalProgramacion() } : match);
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
    if ((!autoVentanas.length && !autoDias.length && !autoDia) || !autoHoraInicio) return alert("Faltan datos de fecha/hora.");
    if (!torneoId) return alert("No hay torneo activo.");
    if (!window.confirm(`¿Generar Fecha ${autoJornada} de ${autoFase}?`)) return;
    setLoading(true);
    
    try {
      const bloqueo = validarJornadaGenerable(autoJornada, autoFase);
      if (bloqueo) throw new Error(bloqueo);
      const historialCruces = new Set(partidos.map(p => `${p.home_team_id}-${p.away_team_id}`));
      const historialCrucesInverso = new Set(partidos.map(p => `${p.away_team_id}-${p.home_team_id}`));
      
      let matchesToInsert: any[] = [];
      // CORRECCIÓN: Parseo estricto local sin alterar el Timezone de manera errónea.
      let maxIntentos = 100, exito = false;

      while (maxIntentos > 0 && !exito) {
        let equiposDisponibles = [...equiposActivos()];
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
          matchesToInsert = distribuirPartidosEnHorarios(tempMatches);
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
    if ((!autoVentanas.length && !autoDias.length && !autoDia) || !autoHoraInicio) return alert("Define al menos una ventana de jornada.");
    if (!torneoId) return alert("No hay torneo activo.");
    if (!window.confirm(`¿Calcular clasificados y generar ${faseGenerar}?`)) return;
    setLoading(true);

    try {
      const bloqueo = validarJornadaGenerable(autoJornada, faseGenerar);
      if (bloqueo) throw new Error(bloqueo);
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
      for (let i = 0; i < numEquipos / 2; i++) {
        const mejor = clasificados[i];
        const peor = clasificados[numEquipos - 1 - i];

        matchesToInsert.push({
          tournament_id: torneoId, home_team_id: mejor.id, away_team_id: peor.id,
          matchday: autoJornada, court: autoCancha, stage: faseGenerar, match_date: null
        });

        if (formatoEliminatoria === "Ida y Vuelta (Estilo Libertadores)") {
           matchesToInsert.push({
             tournament_id: torneoId, home_team_id: peor.id, away_team_id: mejor.id,
             matchday: autoJornada + 1, court: autoCancha, stage: `${faseGenerar} (Vuelta)`, match_date: null
           });
        }
      }

      matchesToInsert = distribuirPartidosEnHorarios(matchesToInsert);
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

  const formatoDatetimeLocal = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };

  const abrirEditorPartido = (partido: any) => {
    if (partido.status === "finished") return alert("Este partido ya esta culminado. No se recomienda mover horarios de partidos finalizados.");
    setPartidoEditando(partido);
    setEditLocalId(partido.home_team_id || "");
    setEditVisitanteId(partido.away_team_id || "");
    setEditFecha(formatoDatetimeLocal(partido.match_date));
    setEditJornada(Number(partido.matchday || 1));
    setEditCancha(partido.court || "Cancha 1");
    setEditFase(partido.stage || "Fase de Grupos");
    setEditNotas(partido.notes || "");
  };

  const guardarEdicionPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partidoEditando) return;
    if (!editLocalId || !editVisitanteId) return alert("Selecciona equipo local y visitante.");
    if (editLocalId === editVisitanteId) return alert("Un equipo no puede jugar contra si mismo.");
    if (editFase === "Fase de Grupos") {
      const local = equipos.find(equipo => equipo.id === editLocalId);
      const visitante = equipos.find(equipo => equipo.id === editVisitanteId);
      if ((local?.group_name || "General") !== (visitante?.group_name || "General")) {
        return alert("En fase de grupos solo pueden enfrentarse equipos del mismo grupo.");
      }
    }
    if (jornadaCulminada(editJornada, editFase) && !mismaJornada(partidoEditando, editJornada, editFase)) {
      return alert(`La fecha ${editJornada} de ${editFase} ya esta culminada.`);
    }

    const editFechaISO = fechaHoraEcuadorAISO(editFecha);
    const conflict = validateManualMatch({
      home_team_id: editLocalId,
      away_team_id: editVisitanteId,
      match_date: editFechaISO,
      court: editCancha,
      stage: editFase
    }, partidos, configuracion.match_duration_minutes, { maxLegs: maxCrucesPorFase(editFase), ignoreMatchId: partidoEditando.id });
    if (conflict) return alert(conflict);

    setLoading(true);
    try {
      const { error } = await supabase.from("matches").update({
        home_team_id: editLocalId,
        away_team_id: editVisitanteId,
        match_date: editFechaISO,
        matchday: editJornada,
        court: editCancha,
        stage: editFase,
        notes: editNotas.trim() || null
      }).eq("id", partidoEditando.id);
      if (error) throw error;
      setPartidoEditando(null);
      await cargarDatos();
    } catch (error: any) {
      alert("Error al editar partido: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const reabrirJornada = async (fase: string, jornada: number) => {
    if (!torneoId) return;
    if (!window.confirm(`Reabrir administrativamente la fecha ${jornada} de ${fase}? Los partidos volveran a quedar editables.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("matches")
        .update({ status: "scheduled" })
        .eq("tournament_id", torneoId)
        .eq("stage", fase)
        .eq("matchday", jornada);
      if (error) throw error;
      await cargarDatos();
    } catch (error: any) {
      alert("No se pudo reabrir la jornada: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE PARTIDO EN VIVO MANTENIDA ---
  const cargarConvocatoria = async (partido: any) => {
    const playersAdvanced = await supabase.from("players")
      .select("id, cedula, full_name, team_id, eligibility_status, eligibility_reason")
      .in("team_id", [partido.home_team_id, partido.away_team_id])
      .order("full_name");
    const playersData = playersAdvanced.error
      ? ((await supabase.from("players").select("id, cedula, full_name, team_id").in("team_id", [partido.home_team_id, partido.away_team_id]).order("full_name")).data || [])
      : (playersAdvanced.data || []);
    const idsPartidos = partidos.map(p => p.id);
    const { data: cardEvents } = idsPartidos.length
      ? await supabase.from("match_events").select("match_id, player_id, team_id, event_type").in("match_id", idsPartidos).in("event_type", ["amarilla", "roja"])
      : { data: [] as any[] };
    const suspensionInfo = getSuspensionInfoForMatch(cardEvents || [], partidos, configuracion, partido);
    const suspendidos = new Set(suspensionInfo.keys());
    const bloqueadoManual = (player: any) => ["suspended", "expelled", "ineligible"].includes(String(player.eligibility_status || "active"));
    const completarSuspension = (player: any) => {
      const info = suspensionInfo.get(player.id);
      if (!info) return player;
      return {
        ...player,
        suspension_reason: info.reason,
        suspension_until_matchday: info.untilMatchday,
        suspension_available_matchday: info.availableMatchday,
        suspension_remaining_matches: info.remainingMatches,
      };
    };
    return {
      habilitados: (playersData || []).filter(player => !suspendidos.has(player.id) && !bloqueadoManual(player)),
      suspendidos: (playersData || []).filter(player => suspendidos.has(player.id) || bloqueadoManual(player)).map(completarSuspension),
    };
  };

  const sortearLlavesEliminatorias = async () => {
    if ((!autoVentanas.length && !autoDias.length && !autoDia) || !torneoId) return alert("Selecciona al menos una ventana de jornada.");
    if (!window.confirm(`¿Sortear cruces de ${faseGenerar} con los clasificados disponibles?`)) return;
    setLoading(true);
    try {
      const bloqueo = validarJornadaGenerable(autoJornada, faseGenerar);
      if (bloqueo) throw new Error(bloqueo);
      const required: Record<string, number> = { "16vos de Final": 32, "Octavos de Final": 16, "Cuartos de Final": 8, "Semifinal": 4, "Final": 2 };
      const count = required[faseGenerar] || 0;
      const previousStage: Record<string, string> = { "Octavos de Final": "16vos de Final", "Cuartos de Final": "Octavos de Final", "Semifinal": "Cuartos de Final", "Final": "Semifinal" };
      const previous = previousStage[faseGenerar];
      const winners = previous ? getStageWinners(partidos, equiposActivos(), previous) : [];
      const groups = calculateStandings(equiposActivos(), partidos.filter(p => p.stage === "Fase de Grupos"), [], configuracion);
      const qualified = (winners.length ? winners : getQualifiedTeams(groups)).slice(0, count);
      if (qualified.length < count) throw new Error(`Solo existen ${qualified.length} equipos clasificados para sortear ${faseGenerar}.`);
      const seed = Date.now();
      const legs = faseGenerar === "Final" ? configuracion.final_legs : configuracion.knockout_legs;
      const fixtures = createDrawKnockoutFixtures(qualified, torneoId, faseGenerar, autoJornada, legs, seed);
      const duplicate = fixtures.some(f => partidos.some(p => p.stage === f.stage && [p.home_team_id, p.away_team_id].sort().join(":") === [f.home_team_id, f.away_team_id].sort().join(":")));
      if (duplicate) throw new Error("Las llaves de esta fase ya existen.");
      const matchesToInsert = distribuirPartidosEnHorarios(fixtures)
        .map(match => faseGenerar === "Final" ? { ...match, court: sedePrincipalProgramacion() } : match);
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      await supabase.from("draw_history").insert([{
        tournament_id: torneoId,
        mode: "automatic",
        title: `Sorteo ${faseGenerar}`,
        pots: qualified.map(team => ({ id: team.id, name: team.name, group: team.group })),
        result: matchesToInsert.map(match => ({ home_team_id: match.home_team_id, away_team_id: match.away_team_id, stage: match.stage })),
        random_seed: String(seed)
      }]);
      alert(`${faseGenerar} sorteada correctamente.`);
      cargarDatos();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirPartido = async (partido: any) => {
    setPartidoActivo(partido);
    setObservacionesPartido(partido.notes || "");
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
         payment_method: "efectivo",
         notes: `Abono arbitraje directo en cancha - Jornada ${partidoActivo.matchday}`
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
    if (!jugadorSel) return;
    const minuto = eventoMinuto ? parseInt(eventoMinuto) : null;
    const eventosData = eventoTipo === "doble_amarilla"
      ? [
        { match_id: partidoActivo.id, player_id: jugadorSel.id, team_id: jugadorSel.team_id, event_type: "amarilla", minute: minuto },
        { match_id: partidoActivo.id, player_id: jugadorSel.id, team_id: jugadorSel.team_id, event_type: "amarilla", minute: minuto },
      ]
      : [{ match_id: partidoActivo.id, player_id: jugadorSel.id, team_id: jugadorSel.team_id, event_type: eventoTipo, minute: minuto }];

    if (isOffline) {
      for (const eventoData of eventosData) await offlineStore.guardarEventoOffline(eventoData);
      const marcaTiempo = Date.now();
      setEventos(prev => [
        ...eventosData.map((eventoData, index) => ({
          ...eventoData,
          id: `offline-${marcaTiempo}-${index}`,
          players: { full_name: jugadorSel.full_name },
          teams: { name: jugadorSel.teams?.name || "Local" },
          created_at: new Date().toISOString()
        })),
        ...prev
      ]);
      alert("[MODO OFFLINE] Evento guardado en la memoria de su dispositivo.");
    } else {
      const { error } = await supabase.from("match_events").insert(eventosData);
      if (error) return alert("No se pudo registrar el evento: " + error.message);
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

  const alternarParticipacion = async (jugador: any) => {
    if (!partidoActivo || !jugador) return;
    if (isOffline) return alert("La convocatoria de jugadores requiere conexion para evitar duplicados.");
    const participacion = eventos.find(evento => evento.event_type === "participacion" && evento.player_id === jugador.id);
    setLoading(true);
    try {
      if (participacion) {
        const { error } = await supabase.from("match_events").delete().eq("id", participacion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("match_events").insert([{
          match_id: partidoActivo.id,
          player_id: jugador.id,
          team_id: jugador.team_id,
          event_type: "participacion",
          minute: null,
        }]);
        if (error) throw error;
      }
      await cargarEventos(partidoActivo.id);
    } catch (error: any) {
      alert("No se pudo actualizar la participacion: " + (error.message || "operacion bloqueada"));
    } finally {
      setLoading(false);
    }
  };

  const iconoEvento = (tipo: string) => {
    if (tipo === "gol") return "G";
    if (tipo === "amarilla") return "TA";
    if (tipo === "roja") return "TR";
    if (tipo === "mvp") return "MVP";
    return "J";
  };

  const etiquetaEvento = (tipo: string) => {
    if (tipo === "gol") return "Gol";
    if (tipo === "amarilla") return "Tarjeta amarilla";
    if (tipo === "roja") return "Tarjeta roja";
    if (tipo === "mvp") return "MVP";
    if (tipo === "participacion") return "Jugo el partido";
    return tipo;
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

  const guardarObservacionesPartido = async () => {
    if (!partidoActivo) return;
    setLoading(true);
    const { error } = await supabase
      .from("matches")
      .update({ notes: observacionesPartido.trim() || null })
      .eq("id", partidoActivo.id);
    setLoading(false);
    if (error) return alert("No se pudieron guardar las observaciones: " + error.message);
    setPartidoActivo({ ...partidoActivo, notes: observacionesPartido.trim() || null });
    setPartidos(prev => prev.map(partido => partido.id === partidoActivo.id ? { ...partido, notes: observacionesPartido.trim() || null } : partido));
    alert("Observaciones actualizadas.");
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

  const descargarPosterJornada = async () => {
    const posterNode = jornadaPosterRef.current || capturaRef.current;
    if (!posterNode) return;
    setLoading(true);
    try {
      posterNode.style.display = "block";
      const canvas = await html2canvas(posterNode, { backgroundColor: "#071735", scale: 3, useCORS: true });
      posterNode.style.display = "none";
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `Poster-${tituloPosterJornada.replace(/\s+/g, "-")}-${configuracion.tournament_year}.png`;
      link.click();
    } catch (error) {
      posterNode.style.display = "none";
      alert("No se pudo generar el poster de la jornada.");
    } finally {
      setLoading(false);
    }
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
      const canvas = await html2canvas(bracketPosterRef.current, { backgroundColor: "#07122d", scale: 3, useCORS: true, width: anchoCompleto, windowWidth: anchoCompleto });
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
    const equiposPlanilla = [partido.home_team_id, partido.away_team_id].filter(Boolean);
    const { data: ledgerPlanilla } = !esEstandar && torneoId && equiposPlanilla.length
      ? await supabase.from("financial_ledger").select("*").eq("tournament_id", torneoId).in("team_id", equiposPlanilla)
      : { data: [] as any[] };
    const { data: pagosPlanilla } = !esEstandar && torneoId && equiposPlanilla.length
      ? await supabase.from("payments").select("*").eq("tournament_id", torneoId).in("team_id", equiposPlanilla)
      : { data: [] as any[] };
    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] || character));
    const fechaPartido = new Date(partido.match_date);
    const crearLineas = (cantidad: number) => Array.from({ length: cantidad }, () => "<span></span>").join("");
    const cupoConfigurado = Number(configuracion.football_modality || 0) + Number(configuracion.substitutes_count || 0);
    const maximoPlantilla = Number(configuracion.max_players_per_team || cupoConfigurado);
    const cupoPartido = Math.max(1, Math.min(cupoConfigurado || maximoPlantilla || 1, maximoPlantilla || cupoConfigurado || 1));
    const altoFilaMm = cupoPartido > 22 ? 3.1 : cupoPartido > 18 ? 3.5 : cupoPartido > 14 ? 4 : 4.6;
    const crearFilasJugadores = () => Array.from({ length: cupoPartido }, (_, index) => `<tr>
          <td class="idx">${index + 1}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>`).join("");
    const normalizarTexto = (value: any) => String(value || "").toLowerCase().trim();
    const esDescuento = (entry: any) =>
      normalizarTexto(entry.category || entry.concept).includes("descuento") ||
      normalizarTexto(entry.payment_method).includes("descuento") ||
      normalizarTexto(entry.reference_type).includes("descuento") ||
      normalizarTexto(entry.reference_type).includes("discount");
    const montoFirmado = (entry: any) => (entry.entry_type === "reversal" ? -1 : 1) * Number(entry.amount || 0);
    const saldoLibro = (teamId: string, categorias: string[]) => {
      const movimientos = (ledgerPlanilla || []).filter(entry => entry.team_id === teamId);
      const categoriaCoincide = (entry: any) => categorias.some(cat => normalizarTexto(entry.category || entry.concept).includes(cat));
      const cargos = movimientos
        .filter(entry => ["charge", "adjustment"].includes(entry.entry_type) && categoriaCoincide(entry) && !esDescuento(entry))
        .reduce((sum, entry) => sum + (entry.entry_type === "adjustment" ? -1 : 1) * Number(entry.amount || 0), 0);
      const pagos = movimientos
        .filter(entry => ["payment", "reversal"].includes(entry.entry_type) && categoriaCoincide(entry) && !esDescuento(entry))
        .reduce((sum, entry) => sum + montoFirmado(entry), 0);
      const descuentos = movimientos
        .filter(entry => ["payment", "reversal", "adjustment"].includes(entry.entry_type) && categoriaCoincide(entry) && esDescuento(entry))
        .reduce((sum, entry) => sum + montoFirmado(entry), 0);
      return Math.max(0, cargos - pagos - descuentos);
    };
    const pagosEquipo = (teamId: string, categorias: string[]) => (pagosPlanilla || [])
      .filter(pago => pago.team_id === teamId && categorias.some(cat => String(pago.concept || "").includes(cat)))
      .reduce((sum, pago) => sum + Number(pago.amount || 0), 0);
    const crearPendientesFinancieros = (teamId: string) => {
      if (esEstandar || !teamId) return ["Pendientes financieros: ________________________________________________"];
      const alertas: string[] = [];
      const tieneLibroEquipo = (ledgerPlanilla || []).some(entry => entry.team_id === teamId);
      const saldoInscripcion = tieneLibroEquipo ? saldoLibro(teamId, ["inscripcion"]) : Math.max(0, costosFinancieros.inscripcion - pagosEquipo(teamId, ["inscripcion"]));
      const saldoTarjetas = saldoLibro(teamId, ["amarilla", "roja", "multa"]);
      const saldoArbitrajeAcumulado = saldoLibro(teamId, ["arbitraje"]);
      const pagoArbitrajePartido = (pagosPlanilla || []).some(pago => pago.team_id === teamId && pago.match_id === partido.id && pago.concept === "arbitraje");
      if (saldoInscripcion > 0) alertas.push(`Inscripcion pendiente: $${saldoInscripcion.toFixed(2)}`);
      if (saldoArbitrajeAcumulado > 0) alertas.push(`Arbitraje acumulado pendiente: $${saldoArbitrajeAcumulado.toFixed(2)}`);
      if (!pagoArbitrajePartido && costosFinancieros.arbitraje > 0) alertas.push(`Arbitraje del partido pendiente: $${costosFinancieros.arbitraje.toFixed(2)}`);
      if (saldoTarjetas > 0) alertas.push(`Tarjetas o sanciones pendientes: $${saldoTarjetas.toFixed(2)}`);
      return alertas.length ? alertas : ["Sin pendientes financieros registrados antes del partido."];
    };
    const crearObservacionesAutomaticas = () => {
      const reglaCambios = configuracion.substitution_rule === "unlimited"
        ? "Cambios ilimitados."
        : configuracion.substitution_rule === "reentry"
          ? "Cambios con reingreso permitido."
          : `Cambios limitados a ${configuracion.substitutes_count} suplente(s).`;
      return [
        `Cupo por equipo: ${cupoPartido} jugador(es). Titulares: ${configuracion.football_modality}. Suplentes: ${configuracion.substitutes_count}.`,
        `Regla de sustituciones: ${reglaCambios}`,
        `Regla disciplinaria: ${configuracion.yellow_cards_for_suspension} amarilla(s) generan suspension; roja directa suspende ${configuracion.red_suspension_matches} partido(s).`,
        ...[partido.home, partido.away].filter(team => team && team.competition_status && team.competition_status !== "active").map(team => `Alerta de equipo: ${team.name} figura como ${team.competition_status}. Motivo: ${team.competition_status_reason || "sin observacion"}`),
        ...suspendidos.map(player => {
          const motivo = player.suspension_reason || player.eligibility_reason || "restriccion vigente";
          const retorno = player.suspension_available_matchday ? ` - Disponible desde fecha ${player.suspension_available_matchday}` : "";
          return `Jugador suspendido/no habilitado: ${player.full_name}${player.cedula ? ` - ID ${player.cedula}` : ""} - Motivo: ${motivo}${retorno}`;
        }),
      ];
    };
    const crearEquipo = (teamId: string, sideLabel: string) => {
      const suspendidosEquipo = suspendidos.filter(player => player.team_id === teamId);
      const suspendidosTexto = suspendidosEquipo.length
        ? suspendidosEquipo.map(player => escapeHtml(`${player.full_name}${player.cedula ? ` (${player.cedula})` : ""}${player.suspension_reason ? ` - ${player.suspension_reason}` : ""}${player.suspension_available_matchday ? ` - vuelve fecha ${player.suspension_available_matchday}` : ""}`)).join(", ")
        : esEstandar ? "________________________________________________" : "Ninguno";
      const pendientesFinancieros = crearPendientesFinancieros(teamId);
      return `<section class="team-half">
        <div class="half-top"><strong>${escapeHtml(torneoNombre)}</strong><span>${escapeHtml(configuracion.tournament_year)}</span></div>
        <div class="match-title">${escapeHtml(partido.home?.name)} <b>VS</b> ${escapeHtml(partido.away?.name)}</div>
        <div class="match-meta"><span><b>Jornada:</b> ${escapeHtml(partido.matchday)}</span><span><b>Cancha:</b> ${escapeHtml(partido.court || "Por confirmar")}</span><span><b>Fecha/hora:</b> ${esEstandar ? "________________" : fechaPartido.toLocaleString("es-EC")}</span></div>
        <div class="team-name-row"><span>${escapeHtml(sideLabel)}</span><b>Equipo:</b><i></i></div>
        <div class="team-rules">Titulares ${configuracion.football_modality} / Suplentes ${configuracion.substitutes_count} / Cupo ${cupoPartido}</div>
        <table class="players-table"><thead><tr><th>N°</th><th>Identificacion</th><th>Nombres y apellidos</th><th>Cam.</th><th>T/S</th><th>Goles</th><th>TA</th><th>TR</th></tr></thead><tbody>${crearFilasJugadores()}</tbody></table>
        <div class="suspended"><b>No convocados automaticamente por suspension:</b> ${suspendidosTexto}</div>
        <div class="observ-mini"><b>Observaciones y pendientes</b><ul>${[...observacionesAutomaticas, ...pendientesFinancieros].map(alerta => `<li>${escapeHtml(alerta)}</li>`).join("")}</ul>${observacionesManual ? `<p><b>Manual:</b> ${escapeHtml(observacionesManual)}</p>` : ""}<div class="lines">${crearLineas(3)}</div></div>
        <div class="team-footer"><div><b>Firma del dirigente</b></div><div><b>Firma arbitro/vocal</b></div></div>
      </section>`;
    };
    const observacionesAutomaticas = crearObservacionesAutomaticas();
    const observacionesManual = String(partido.notes || "").trim();
    const html = `<!DOCTYPE html><html lang="es"><head><title>Planilla oficial</title><style>
      @page{size:A4 landscape;margin:4mm}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0}body{font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff}.sheet{width:289mm;height:202mm;padding:3mm;border:2px solid #111827;display:grid;grid-template-columns:1fr 0 1fr;gap:3mm;overflow:hidden}.cut-line{border-left:1.5px dashed #111827;height:100%}.team-half{min-width:0;height:100%;display:flex;flex-direction:column;border:1px solid #111827;padding:2mm;page-break-inside:avoid;break-inside:avoid}.half-top{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0f5132;padding-bottom:1mm}.half-top strong{font-size:10px;text-transform:uppercase;letter-spacing:.7px}.half-top span{font-size:8px;font-weight:900;color:#0f5132}.match-title{text-align:center;font-size:9px;font-weight:900;text-transform:uppercase;padding:1mm 0}.match-title b{color:#0f5132;margin:0 2mm}.match-meta{display:grid;grid-template-columns:.55fr 1fr 1.3fr;gap:1mm;font-size:6.4px;background:#f3f4f6;border:1px solid #cbd5e1;padding:1mm}.match-meta span{min-width:0;border-bottom:1px solid #9ca3af}.team-name-row{display:grid;grid-template-columns:auto auto 1fr;align-items:end;gap:1.2mm;margin-top:1mm;font-size:8px}.team-name-row span{border:1px solid #0f5132;background:#0f5132;color:#fff;padding:.8mm 1.4mm;font-weight:900;text-transform:uppercase}.team-name-row b{text-transform:uppercase}.team-name-row i{display:block;height:5mm;border-bottom:1.5px solid #111827}.team-rules{font-size:6.4px;text-align:center;text-transform:uppercase;font-weight:900;color:#475569;padding:.8mm 0}.players-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:5.6px}.players-table th,.players-table td{border:1px solid #64748b;padding:.35mm;text-align:center;height:${altoFilaMm}mm;line-height:1}.players-table th{background:#e5e7eb;color:#111827;text-transform:uppercase;font-weight:900}.players-table th:nth-child(1),.players-table td:nth-child(1){width:5mm}.players-table th:nth-child(2),.players-table td:nth-child(2){width:23mm}.players-table th:nth-child(4),.players-table td:nth-child(4){width:7mm}.players-table th:nth-child(5),.players-table td:nth-child(5),.players-table th:nth-child(6),.players-table td:nth-child(6),.players-table th:nth-child(7),.players-table td:nth-child(7),.players-table th:nth-child(8),.players-table td:nth-child(8){width:6.5mm}.players-table .idx{background:#f8fafc;font-weight:900;color:#0f5132}.suspended{border:1px solid #f1b0a7;border-left:3px solid #b42318;background:#fff5f5;padding:.8mm;font-size:5.7px;margin-top:.8mm;min-height:4mm;page-break-inside:avoid;break-inside:avoid}.observ-mini{border:1px solid #111827;padding:.8mm;font-size:5.6px;min-height:12mm;margin-top:.8mm}.observ-mini b{display:block;text-transform:uppercase;margin-bottom:.3mm}.observ-mini ul{margin:0 0 .3mm 0;padding-left:3mm}.observ-mini p{margin:0}.lines span{display:block;height:3px;border-bottom:1px solid #cbd5e1}.team-footer{display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-size:6px;margin-top:auto;padding-top:1mm}.team-footer div{border-top:1px solid #111827;min-height:5mm;padding-top:1mm;text-align:center}
      @media print{html,body{width:297mm;height:210mm}.sheet{width:289mm;height:202mm;margin:0;overflow:hidden;page-break-inside:avoid;break-inside:avoid}.team-half,.players-table{page-break-inside:avoid;break-inside:avoid}}
    </style></head><body><section class="sheet">${crearEquipo(partido.home_team_id, "Equipo local")}<div class="cut-line"></div>${crearEquipo(partido.away_team_id, "Equipo visitante")}</section></body></html>`;
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

  const copiarEnlacePublico = async () => {
    const enlaceOficial = `${appUrl}/torneo/${torneoSlug}`;
    if (!torneoSlug) return alert("Este torneo aun no tiene enlace publico configurado.");
    try {
      await navigator.clipboard.writeText(enlaceOficial);
      alert(`Link publico copiado:\n${enlaceOficial}`);
    } catch {
      window.prompt("Copia el link publico del torneo:", enlaceOficial);
    }
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
  const partidosPoster = [...partidosFiltrados].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  const claveDiaPoster = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  const partidosPorDiaPoster = partidosPoster.reduce<Record<string, any[]>>((acc, partido) => {
    const key = claveDiaPoster(partido.match_date);
    (acc[key] ||= []).push(partido);
    return acc;
  }, {});
  const diasPoster = Object.keys(partidosPorDiaPoster).sort();
  const tituloPosterJornada = filtroJornada ? `FECHA ${filtroJornada}` : "JORNADA OFICIAL";
  const fechasPosterTexto = diasPoster.map(dia => new Date(`${dia}T12:00:00-05:00`).toLocaleDateString("es-EC", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })).join(" / ");
  const gruposManual = Array.from(new Set(equipos.map(equipo => equipo.group_name || "General"))).sort();
  const equiposManual = faseBase(faseManual) === "Fase de Grupos" && grupoManual !== "Todos"
    ? equipos.filter(equipo => (equipo.group_name || "General") === grupoManual)
    : equipos;
  const jornadasCulminadas = Array.from(new Map(
    partidos
      .filter(partido => partido.status === "finished")
      .map(partido => [`${partido.stage}-${partido.matchday}`, { stage: partido.stage, matchday: partido.matchday }])
  ).values());
  const fasesCuadro = ["16vos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Final"];
  const fasesVisibles = fasesCuadro.filter(fase => partidos.some(partido => partido.stage === fase || partido.stage === `${fase} (Vuelta)`));
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
    const participaciones = eventos.filter(e => e.event_type === "participacion");
    const eventosDeJuego = eventos.filter(e => e.event_type !== "participacion");
    const participantesIds = new Set(participaciones.map(e => e.player_id));
    const jugadoresLocal = jugadores.filter(j => j.team_id === partidoActivo.home_team_id);
    const jugadoresVisitante = jugadores.filter(j => j.team_id === partidoActivo.away_team_id);
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

        <div className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <label className="text-xs font-black uppercase tracking-widest text-[#D4A017]">Observaciones del encuentro</label>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Sustituciones: {configuracion.substitution_rule === "unlimited" ? "cambios ilimitados" : configuracion.substitution_rule === "reentry" ? "cambios con reingreso" : `limitadas a ${configuracion.substitutes_count} suplente(s)`}
              </p>
              <textarea value={observacionesPartido} onChange={e => setObservacionesPartido(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-sm text-white outline-none focus:border-[#D4A017]" placeholder="Comentarios adicionales del partido..." />
            </div>
            <button onClick={guardarObservacionesPartido} disabled={loading} className="rounded-xl border border-[#D4A017]/50 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#D4A017] hover:bg-[#D4A017] hover:text-black">
              Guardar observaciones
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4A017]">Jugadores que disputaron el partido</p>
              <h4 className="text-xl font-black uppercase text-white">Control de participacion</h4>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300">
              {participaciones.length} registrado(s)
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { title: partidoActivo.home?.name || "Local", players: jugadoresLocal },
              { title: partidoActivo.away?.name || "Visitante", players: jugadoresVisitante },
            ].map(group => (
              <div key={group.title} className="rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3">
                <p className="mb-3 text-xs font-black uppercase text-white">{group.title}</p>
                <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
                  {group.players.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[#2E2E2E] p-3 text-xs font-bold text-gray-500">No hay jugadores habilitados para este equipo.</p>
                  ) : group.players.map(jugador => {
                    const marcado = participantesIds.has(jugador.id);
                    return (
                      <button
                        key={jugador.id}
                        type="button"
                        onClick={() => alternarParticipacion(jugador)}
                        disabled={loading || partidoActivo.status === "finished"}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-all ${marcado ? "border-emerald-500/70 bg-emerald-500/15 text-white" : "border-[#2E2E2E] bg-[#141414] text-white hover:border-[#D4A017]/50"} disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <span className="min-w-0">
                          <span className="block break-words text-xs font-black uppercase">{jugador.full_name}</span>
                          {jugador.cedula && <span className="mt-0.5 block text-[10px] font-bold uppercase text-gray-500">ID {jugador.cedula}</span>}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${marcado ? "bg-emerald-400 text-black" : "bg-[#2E2E2E] text-gray-400"}`}>
                          {marcado ? "Jugo" : "No"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {partidoActivo.status !== 'finished' && (
            <div className="lg:col-span-1 bg-[#141414] border border-[#2E2E2E] rounded-2xl p-6 h-fit">
              <form onSubmit={registrarEvento} className="space-y-4">
                <select value={eventoJugador} onChange={e => setEventoJugador(e.target.value)} required className="w-full p-2 mt-1 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-white">
                    <option value="" disabled>Selecciona el jugador</option>
                    <optgroup label={partidoActivo.home?.name}>{jugadoresLocal.map(j => <option key={j.id} value={j.id}>{j.full_name}</option>)}</optgroup>
                    <optgroup label={partidoActivo.away?.name}>{jugadoresVisitante.map(j => <option key={j.id} value={j.id}>{j.full_name}</option>)}</optgroup>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select value={eventoTipo} onChange={e => setEventoTipo(e.target.value)} className="w-full p-2 mt-1 bg-[#1c1c1c] border border-[#2e2e2e] text-white rounded"><option value="gol">Gol</option><option value="amarilla">Amarilla</option><option value="doble_amarilla">Doble amarilla</option><option value="roja">Roja directa</option><option value="mvp">MVP</option></select>
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
              {eventosDeJuego.map(ev => (
                <div key={ev.id} className="flex items-center justify-between bg-[#141414] p-3 rounded-xl border border-[#2E2E2E]">
                  {editandoEventoId === ev.id ? (
                      <div className="flex items-center gap-4 w-full">
                        <select id={`edit-t-${ev.id}`} defaultValue={ev.event_type} className="bg-black p-2 text-white rounded border border-[#2e2e2e]">
                          <option value="gol">Gol</option><option value="amarilla">Amarilla</option><option value="roja">Roja directa</option><option value="mvp">MVP</option>
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
      {jornadasCulminadas.length > 0 && (
        <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/30 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">Fechas culminadas</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {jornadasCulminadas.map(item => (
              <span key={`${item.stage}-${item.matchday}`} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-900/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-100">
                {item.stage} · Fecha {item.matchday}
                <button type="button" onClick={() => reabrirJornada(item.stage, Number(item.matchday))} className="rounded-full border border-emerald-300/40 px-2 py-0.5 text-[9px] text-emerald-100 hover:bg-emerald-500 hover:text-black">Reabrir</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4A017]">Hora oficial Ecuador</p>
            <p className="text-sm font-bold text-gray-300">Los campos se cargan con la fecha actual y hora local de Ecuador.</p>
          </div>
          <button type="button" onClick={aplicarFechaHoraEcuador} className="rounded-lg border border-[#D4A017]/50 bg-[#D4A017]/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#D4A017] transition-all hover:bg-[#D4A017] hover:text-black">
            Usar ahora
          </button>
        </div>
        
        {modoProgramacion === "manual" && (
          <form onSubmit={programarPartido} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-6 rounded-xl border border-blue-500/30 bg-blue-950/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Modo manual: jornada por partidos</p>
              <p className="mt-1 text-sm font-bold text-blue-100">Agrega cada cruce con su propia fecha, hora y cancha. Todos quedan dentro de la misma jornada, aunque se jueguen sabado, domingo u otros dias. El automatico sigue disponible cuando quieres que el sistema arme los cruces.</p>
              <button type="button" onClick={() => setModoProgramacion("automatico")} className="mt-3 rounded-lg border border-[#D4A017]/50 bg-[#D4A017]/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#D4A017] hover:bg-[#D4A017] hover:text-black">Usar generador automatico</button>
            </div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Grupo</label><select value={grupoManual} onChange={e => { setGrupoManual(e.target.value); setLocalId(""); setVisitanteId(""); }} disabled={faseBase(faseManual) !== "Fase de Grupos"} className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded disabled:opacity-60"><option value="Todos">Todos</option>{gruposManual.map(grupo => <option key={grupo} value={grupo}>Grupo {grupo}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Local</label><select value={localId} onChange={e => setLocalId(e.target.value)} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded"><option value="" disabled>Seleccionar...</option>{equiposManual.map(eq => <option key={eq.id} value={eq.id} disabled={!equipoActivo(eq)}>{eq.name} · Grupo {eq.group_name || "General"}{!equipoActivo(eq) ? " - no habilitado" : ""}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Visitante</label><select value={visitanteId} onChange={e => setVisitanteId(e.target.value)} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded"><option value="" disabled>Seleccionar...</option>{equiposManual.map(eq => <option key={eq.id} value={eq.id} disabled={!equipoActivo(eq)}>{eq.name} · Grupo {eq.group_name || "General"}{!equipoActivo(eq) ? " - no habilitado" : ""}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Instancia</label><select value={faseManual} onChange={e => { setFaseManual(e.target.value); setLocalId(""); setVisitanteId(""); }} className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded">{opcionesFase.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
            <label className="flex items-center gap-3 rounded border border-[#2E2E2E] bg-[#1C1C1C] p-3 text-xs font-bold uppercase text-gray-300">
              <input type="checkbox" checked={manualEsVuelta} onChange={e => setManualEsVuelta(e.target.checked)} className="h-4 w-4 accent-[#D4A017]" />
              Partido de vuelta
            </label>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Jornada/Llave</label><input type="number" value={jornadaManual} onChange={e => setJornadaManual(Number(e.target.value))} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase"><MapPin size={14} /> Sede / Cancha</label><input list="opciones-sede-cancha" type="text" value={canchaManual} onChange={e => setCanchaManual(e.target.value)} className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" placeholder="Ej: Estadio Monumental" /></div>
            <datalist id="opciones-sede-cancha">{canchasProgramacion().map(cancha => <option key={cancha} value={cancha} />)}</datalist>
            <div><label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase"><CalendarDays size={14} /> Fecha</label><input type="date" value={obtenerDiaDeCampo(fecha)} onChange={e => setFecha(actualizarFechaHoraCampo(fecha, "dia", e.target.value))} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase"><Clock3 size={14} /> Hora</label><input type="time" value={obtenerHoraDeCampo(fecha)} onChange={e => setFecha(actualizarFechaHoraCampo(fecha, "hora", e.target.value))} required className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" /></div>
            <div className="md:col-span-4"><label className="text-xs font-bold text-gray-500 uppercase">Observaciones</label><textarea value={observacionesManual} onChange={e => setObservacionesManual(e.target.value)} rows={2} className="w-full p-3 mt-1 bg-[#1C1C1C] text-white border border-[#2E2E2E] rounded" placeholder="Comentarios opcionales del encuentro..." /></div>
            <button type="submit" disabled={loading} className="md:col-span-2 py-3 bg-[#D4A017] text-black font-black uppercase rounded shadow-[0_0_15px_rgba(212,160,23,0.3)]">{loading ? "Procesando..." : "Agregar a jornada"}</button>
            <div className="md:col-span-6 rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4A017]">Jornada manual pendiente</p>
                  <p className="text-xs font-bold text-gray-400">Aqui se acumulan los partidos antes de guardarlos en Supabase.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setManualPendientes([])} disabled={!manualPendientes.length || loading} className="rounded-lg border border-red-500/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 disabled:opacity-40">Limpiar</button>
                  <button type="button" onClick={guardarJornadaManual} disabled={!manualPendientes.length || loading} className="rounded-lg bg-emerald-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40">{loading ? "Guardando..." : `Guardar ${manualPendientes.length} partido(s)`}</button>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {manualPendientes.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#2E2E2E] p-3 text-xs font-bold text-gray-500">Todavia no hay partidos agregados a esta jornada manual.</p>
                ) : manualPendientes.map(partido => (
                  <div key={partido.id} className="grid grid-cols-1 gap-2 rounded-lg border border-[#2E2E2E] bg-[#141414] p-3 text-sm md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
                    <div>
                      <p className="font-black text-white">{partido.home_name} vs {partido.away_name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Fecha {partido.matchday} - {partido.stage}</p>
                    </div>
                    <p className="font-bold text-gray-300">{new Date(partido.match_date).toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="font-bold text-gray-300">{partido.court}</p>
                    <button type="button" onClick={() => quitarPartidoManualPendiente(partido.id)} className="rounded border border-red-500/40 px-3 py-2 text-[10px] font-black uppercase text-red-300 hover:bg-red-600 hover:text-white">Quitar</button>
                  </div>
                ))}
              </div>
            </div>
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
            <div className="md:col-span-2">
              <label className="flex items-center gap-1 text-xs font-bold text-[#D4A017] uppercase"><CalendarDays size={14} /> Fecha de jornada</label>
              <div className="mt-1 flex gap-2">
                <input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} className="w-full p-3 bg-[#141414] text-white border border-[#2E2E2E] rounded" />
                <button type="button" onClick={agregarDiaAutomatico} className="inline-flex items-center gap-1 px-3 rounded bg-[#D4A017] text-black text-xs font-black uppercase"><Plus size={14} /> Agregar</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {autoDias.map(dia => <button type="button" key={dia} onClick={() => quitarDiaAutomatico(dia)} className="rounded-full border border-[#D4A017]/40 bg-[#D4A017]/10 px-3 py-1 text-[10px] font-black text-[#D4A017]">{dia} ×</button>)}
              </div>
            </div>
            <div className="md:col-span-6 rounded-xl border border-[#2E2E2E] bg-[#141414] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D4A017]">Horarios por dia de juego</p>
              <p className="mt-1 text-xs font-bold text-gray-400">Configura horarios distintos para cada dia de la misma jornada.</p>
              <div className="mt-3 grid gap-2">
                {autoVentanas.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#2E2E2E] p-3 text-xs font-bold text-gray-500">Agrega una fecha para crear su ventana horaria.</p>
                ) : autoVentanas.map((ventana, index) => (
                  <div key={`${ventana.day}-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <input type="date" value={ventana.day} onChange={e => actualizarVentanaJornada(index, "day", e.target.value)} className="rounded border border-[#2E2E2E] bg-[#0a0a0a] p-2 text-sm text-white" />
                    <input type="time" value={ventana.startTime} onChange={e => actualizarVentanaJornada(index, "startTime", e.target.value)} className="rounded border border-[#2E2E2E] bg-[#0a0a0a] p-2 text-sm text-white" />
                    <input type="time" value={ventana.endTime} onChange={e => actualizarVentanaJornada(index, "endTime", e.target.value)} className="rounded border border-[#2E2E2E] bg-[#0a0a0a] p-2 text-sm text-white" />
                    <button type="button" onClick={() => quitarDiaAutomatico(ventana.day)} className="rounded border border-red-500/40 px-3 py-2 text-xs font-black uppercase text-red-400 hover:bg-red-600 hover:text-white">Quitar</button>
                  </div>
                ))}
              </div>
            </div>
            <div><label className="flex items-center gap-1 text-xs font-bold text-[#D4A017] uppercase"><Clock3 size={14} /> Hora primer partido</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="flex items-center gap-1 text-xs font-bold text-[#D4A017] uppercase"><Clock3 size={14} /> Hora ultimo partido</label><input type="time" value={autoHoraFin} onChange={e => setAutoHoraFin(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
            <div><label className="text-xs font-bold text-[#D4A017] uppercase">Intervalo</label><input type="number" min={1} value={autoIntervalo} onChange={e => setAutoIntervalo(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
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
               <div className="md:col-span-4 rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-4">
                 <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">Regla activa de cruces</p>
                 <p className="mt-1 text-sm font-bold text-yellow-50">
                   {configuracion.knockout_pairing_mode === "group_cross"
                     ? "Secuencia de grupos: primero del Grupo A vs segundo del Grupo B, y viceversa."
                     : configuracion.knockout_pairing_mode === "manual"
                       ? "Cruces manuales: arma cada partido desde el modo Manual y el sistema validara duplicados."
                       : "Tabla general: mejor clasificado general vs ultimo clasificado general."}
                 </p>
               </div>
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
               
               <div className="md:col-span-2">
                 <label className="flex items-center gap-1 text-xs font-bold text-[#D4A017] uppercase"><CalendarDays size={14} /> Fecha de jornada</label>
                 <div className="mt-1 flex gap-2">
                   <input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} className="w-full p-3 bg-[#141414] text-white border border-[#2E2E2E] rounded" />
                   <button type="button" onClick={agregarDiaAutomatico} className="inline-flex items-center gap-1 px-3 rounded bg-[#D4A017] text-black text-xs font-black uppercase"><Plus size={14} /> Agregar</button>
                 </div>
                 <div className="mt-2 flex flex-wrap gap-2">
                   {autoDias.map(dia => <button type="button" key={dia} onClick={() => quitarDiaAutomatico(dia)} className="rounded-full border border-[#D4A017]/40 bg-[#D4A017]/10 px-3 py-1 text-[10px] font-black text-[#D4A017]">{dia} ×</button>)}
                 </div>
               </div>
               <div className="md:col-span-4 rounded-xl border border-[#2E2E2E] bg-[#141414] p-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#D4A017]">Horarios por dia de juego</p>
                 <p className="mt-1 text-xs font-bold text-gray-400">Estas ventanas tambien se usan para llaves, semifinales y final.</p>
                 <div className="mt-3 grid gap-2">
                   {autoVentanas.length === 0 ? (
                     <p className="rounded-lg border border-dashed border-[#2E2E2E] p-3 text-xs font-bold text-gray-500">Agrega una fecha para crear su ventana horaria.</p>
                   ) : autoVentanas.map((ventana, index) => (
                     <div key={`${ventana.day}-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                       <input type="date" value={ventana.day} onChange={e => actualizarVentanaJornada(index, "day", e.target.value)} className="rounded border border-[#2E2E2E] bg-[#0a0a0a] p-2 text-sm text-white" />
                       <input type="time" value={ventana.startTime} onChange={e => actualizarVentanaJornada(index, "startTime", e.target.value)} className="rounded border border-[#2E2E2E] bg-[#0a0a0a] p-2 text-sm text-white" />
                       <input type="time" value={ventana.endTime} onChange={e => actualizarVentanaJornada(index, "endTime", e.target.value)} className="rounded border border-[#2E2E2E] bg-[#0a0a0a] p-2 text-sm text-white" />
                       <button type="button" onClick={() => quitarDiaAutomatico(ventana.day)} className="rounded border border-red-500/40 px-3 py-2 text-xs font-black uppercase text-red-400 hover:bg-red-600 hover:text-white">Quitar</button>
                     </div>
                   ))}
                 </div>
               </div>
               <div><label className="flex items-center gap-1 text-xs font-bold text-[#D4A017] uppercase"><Clock3 size={14} /> Hora primer partido</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
               <div><label className="flex items-center gap-1 text-xs font-bold text-[#D4A017] uppercase"><Clock3 size={14} /> Hora ultimo partido</label><input type="time" value={autoHoraFin} onChange={e => setAutoHoraFin(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">Intervalo</label><input type="number" min={1} value={autoIntervalo} onChange={e => setAutoIntervalo(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>
               <div><label className="text-xs font-bold text-[#D4A017] uppercase">N° Fecha</label><input type="number" value={autoJornada} onChange={e => setAutoJornada(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#141414] text-white border border-[#2E2E2E] rounded" /></div>

               <div className="md:col-span-4">
                 <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-cyan-200">Puedes generar por regla configurada o sortear los clasificados.</p>
                 <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black text-sm font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(212,160,23,0.3)] hover:scale-[1.01] transition-transform">
                   ⚡ {loading ? "Calculando..." : "Calcular Clasificados y Generar Llaves"}
                 </button>
                 <button type="button" onClick={sortearLlavesEliminatorias} disabled={loading} className="mt-3 w-full py-4 rounded-xl border border-cyan-400/50 bg-cyan-500/10 text-sm font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-400 hover:text-black">
                   Sortear cruces
                 </button>
               </div>
            </form>

            {fasesVisibles.length > 0 && (
              <div ref={bracketPosterRef} className="relative z-10 rounded-2xl border border-blue-400/30 bg-gradient-to-b from-[#081a46] via-[#07122d] to-[#050914] p-5 overflow-x-auto" style={fondoPosterUrl && usarFondoPersonalizado ? { backgroundImage: `linear-gradient(rgba(4,12,38,.82), rgba(4,12,38,.94)), url("${fondoPosterUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                <div className="text-center mb-7">
                  <p className="text-blue-300 text-[10px] uppercase tracking-[0.35em] font-black">Cuadro eliminatorio oficial</p>
                  <h3 className="text-white text-2xl font-black uppercase mt-2">{torneoNombre} · {configuracion.tournament_year}</h3>
                  <p className="text-[#D4A017] text-xs font-bold uppercase mt-1">Final · {sedePrincipalProgramacion()}</p>
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
                                  <span className="flex-1 break-words text-white text-[10px] font-black uppercase leading-tight">{equipo?.name || "Por definir"}</span>
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

            <button onClick={copiarEnlacePublico} className="bg-blue-950 border border-blue-600 text-blue-200 hover:bg-blue-600 hover:text-white font-black uppercase text-xs px-4 py-2 rounded shadow-lg transition-all flex items-center gap-2">
              <Copy size={14} /> Copiar link
            </button>

            {/* BOTÓN POSTER */}
            <button onClick={descargarPosterJornada} disabled={loading || partidosFiltrados.length === 0} className="bg-transparent border border-[#D4A017] text-[#D4A017] hover:bg-[#D4A017] hover:text-black font-black uppercase text-xs px-4 py-2 rounded shadow-lg transition-all flex items-center gap-2">
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
              <div key={p.id} className="grid grid-cols-1 gap-4 rounded-2xl border border-[#2E2E2E] bg-[#141414] p-4 transition-all hover:border-[#D4A017] md:grid-cols-[minmax(0,1fr)_124px_minmax(0,1fr)_minmax(180px,auto)] md:items-center relative overflow-hidden">
                {p.stage !== 'Fase de Grupos' && (
                  <div className="absolute top-0 left-0 bg-[#D4A017] text-black text-[9px] font-black uppercase px-3 py-1 rounded-br-lg shadow-lg z-10">
                    {p.stage}
                  </div>
                )}
                
                <div className="relative z-20 min-w-0 rounded-xl border border-[#2E2E2E] bg-[#0f0f0f] p-3 md:text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4A017]">Equipo local</p>
                  <p className="text-[10px] text-gray-500 font-normal uppercase">Fecha {p.matchday} • {new Date(p.match_date).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })} • {p.court || "Cancha 1"}</p>
                  {p.notes && <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#D4A017]">Obs: {p.notes}</p>}
                  <p className="mt-1 break-words text-base font-black uppercase leading-tight text-white md:text-lg">{p.home?.name}</p>
                </div>
                <div className="relative z-20 flex flex-row items-center justify-center gap-3 md:flex-col md:gap-2">
                  <span className="rounded-full border border-[#D4A017]/40 bg-[#0a0a0a] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#D4A017]">{new Date(p.match_date).toLocaleTimeString('es-EC', { hour: '2-digit', minute:'2-digit' })}</span>
                  <div className="w-28 rounded-lg border border-[#2E2E2E] bg-[#0a0a0a] px-4 py-2 text-center font-mono text-xl font-black text-[#D4A017]">
                    {p.status === 'finished' ? `${p.home_goals} - ${p.away_goals}` : "VS"}
                  </div>
                  <span className="max-w-[120px] truncate text-[10px] font-bold uppercase text-gray-500">{p.court || "Cancha 1"}</span>
                </div>
                <div className="relative z-20 min-w-0 rounded-xl border border-[#2E2E2E] bg-[#0f0f0f] p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D4A017]">Equipo visitante</p>
                  <p className="mt-1 break-words text-base font-black uppercase leading-tight text-white md:text-lg">{p.away?.name}</p>
                </div>
                <div className="relative z-20 grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-end">
                  
                  {p.status !== 'finished' && (
                    <button onClick={() => enviarRecordatorioWhatsApp(p)} className="rounded-lg border border-[#25D366]/50 bg-[#25D366]/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#25D366] transition-all hover:bg-[#25D366] hover:text-black">
                      📲 Notificar
                    </button>
                  )}
                  {p.status !== 'finished' && (
                    <button onClick={() => abrirEditorPartido(p)} className="rounded-lg border border-blue-700 bg-blue-950 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-300 transition-all hover:bg-blue-800">
                      Editar
                    </button>
                  )}
                  <button onClick={() => imprimirPlanilla(p)} className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-gray-700">
                    Planilla abierta
                  </button>
                  {p.status === "finished" && p.stage !== "Fase de Grupos" && (
                    <button onClick={() => registrarPenales(p)} className="rounded-lg border border-blue-700 bg-blue-950 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-300 transition-all hover:bg-blue-800">
                      Penales
                    </button>
                  )}

                  <button onClick={() => abrirPartido(p)} className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${p.status === 'finished' ? 'bg-[#2E2E2E] text-gray-400 hover:text-white' : 'bg-[#D4A017] text-black hover:bg-yellow-500 shadow-[0_0_10px_rgba(212,160,23,0.3)]'}`}>
                    {p.status === 'finished' ? 'Ver Detalles' : 'Jugar Partido'}
                  </button>
                  {p.status !== 'finished' && (
                    <button onClick={() => eliminarPartido(p.id)} className="rounded-lg border border-red-900/50 bg-red-900/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-600 hover:text-white">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {partidoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#D4A017]/50 bg-[#141414] shadow-[0_0_50px_rgba(212,160,23,0.18)]">
            <div className="border-b border-[#2E2E2E] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4A017]">Editar partido guardado</p>
              <h3 className="mt-1 text-xl font-black uppercase text-white">{partidoEditando.home?.name} vs {partidoEditando.away?.name}</h3>
            </div>
            <form onSubmit={guardarEdicionPartido} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Equipo local</label>
                <select value={editLocalId} onChange={e => setEditLocalId(e.target.value)} required className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]">
                  <option value="" disabled>Seleccionar...</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Equipo visitante</label>
                <select value={editVisitanteId} onChange={e => setEditVisitanteId(e.target.value)} required className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]">
                  <option value="" disabled>Seleccionar...</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold uppercase text-gray-400"><CalendarDays size={14} /> Fecha</label>
                <input type="date" value={obtenerDiaDeCampo(editFecha)} onChange={e => setEditFecha(actualizarFechaHoraCampo(editFecha, "dia", e.target.value))} required className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold uppercase text-gray-400"><Clock3 size={14} /> Hora</label>
                <input type="time" value={obtenerHoraDeCampo(editFecha)} onChange={e => setEditFecha(actualizarFechaHoraCampo(editFecha, "hora", e.target.value))} required className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Cancha</label>
                <input list="opciones-sede-cancha" type="text" value={editCancha} onChange={e => setEditCancha(e.target.value)} className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Instancia</label>
                <select value={editFase} onChange={e => setEditFase(e.target.value)} className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]">
                  {[...opcionesFase, ...opcionesFase.map(f => `${f} (Vuelta)`)].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-400">Jornada/Llave</label>
                <input type="number" value={editJornada} onChange={e => setEditJornada(Number(e.target.value))} min={1} className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase text-gray-400">Notas administrativas</label>
                <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white outline-none focus:border-[#D4A017]" placeholder="Cambio de horario solicitado, cancha, observacion..." />
              </div>
              <div className="flex gap-3 md:col-span-2">
                <button type="button" onClick={() => setPartidoEditando(null)} className="flex-1 rounded-xl border border-[#2E2E2E] bg-[#1C1C1C] py-3 text-xs font-black uppercase tracking-widest text-gray-300">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-[#D4A017] py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-400">{loading ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "none" }} ref={jornadaPosterRef}>
        <div
          className="relative w-[1080px] min-h-[1350px] overflow-hidden bg-[#06183a] px-14 py-12 font-sans text-white"
          style={fondoPosterUrl && usarFondoPersonalizado ? { backgroundImage: `linear-gradient(135deg, rgba(3,16,46,.82), rgba(4,24,58,.92)), url("${fondoPosterUrl}")`, backgroundSize: "cover", backgroundPosition: "center", fontFamily: posterFontFamily } : { backgroundImage: "radial-gradient(circle at 10% 20%, rgba(212,160,23,.32), transparent 24%), radial-gradient(circle at 92% 70%, rgba(212,160,23,.24), transparent 22%), linear-gradient(145deg, #03102c, #063b78 52%, #020817)", fontFamily: posterFontFamily }}
        >
          <div className="absolute inset-8 rounded-[32px] border-4 border-white/85" />
          <div className="absolute inset-12 rounded-[24px] border border-[#D4A017]/55" />
          <div className="absolute right-10 top-10 rounded-2xl border border-white/20 bg-black/25 px-5 py-3 text-right">
            <p className="text-[12px] font-black uppercase text-[#D4A017]">Game Legal Tournament</p>
            <p className="text-xl font-black uppercase">{configuracion.tournament_year}</p>
          </div>
          <div className="relative z-10 flex items-start justify-between gap-8">
            <div className="max-w-[760px]">
              <p className="mb-4 inline-block rounded-full border border-[#D4A017]/60 bg-[#D4A017]/15 px-5 py-2 text-[13px] font-black uppercase text-[#D4A017]">Cronograma oficial</p>
              <h1 className="text-7xl font-black uppercase leading-none text-white drop-shadow-[0_5px_0_rgba(0,0,0,.65)]">{tituloPosterJornada}</h1>
              <p className="mt-4 text-2xl font-black uppercase text-white/90">{partidosPoster[0]?.stage || "Programacion"}</p>
              <p className="mt-2 text-lg font-black uppercase text-[#D4A017]">{fechasPosterTexto || "Fechas por confirmar"}</p>
            </div>
            <div className="rounded-2xl border border-[#D4A017]/60 bg-black/45 p-3 text-center shadow-2xl">
              {appUrl && <QRCodeSVG value={appUrl} size={112} level={"H"} fgColor="#D4A017" bgColor="#071735" />}
              <span className="mt-2 block text-[11px] font-black uppercase">Ver en vivo</span>
            </div>
          </div>
          <div className="relative z-10 mt-10 space-y-7">
            {diasPoster.map(dia => (
              <section key={dia} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-[3px] flex-1 bg-gradient-to-r from-transparent via-[#D4A017] to-transparent" />
                  <h2 className="rounded-full bg-[#D4A017] px-6 py-2 text-lg font-black uppercase tracking-widest text-black shadow-lg">
                    {new Date(`${dia}T12:00:00-05:00`).toLocaleDateString("es-EC", { weekday: "long", day: "2-digit", month: "long" })}
                  </h2>
                  <div className="h-[3px] flex-1 bg-gradient-to-r from-transparent via-[#D4A017] to-transparent" />
                </div>
                <div className="space-y-5">
                  {partidosPorDiaPoster[dia].map(p => (
                    <div key={p.id} className="relative grid grid-cols-[96px_1fr_148px_1fr_96px] items-center overflow-visible rounded-[18px] border border-white/80 bg-white px-4 py-4 text-[#072047] shadow-[0_18px_35px_rgba(0,0,0,.35)]">
                      <div className="flex justify-center">
                        {p.home?.shield_url ? <Image src={p.home.shield_url} alt={`Escudo de ${p.home.name}`} width={72} height={72} unoptimized crossOrigin="anonymous" className="h-[72px] w-[72px] object-contain drop-shadow-lg" /> : <div className="h-[72px] w-[72px] rounded-full bg-[#dbeafe]" />}
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="break-words text-[24px] font-black uppercase leading-tight">{p.home?.name || "Local"}</p>
                      </div>
                      <div className="relative mx-auto flex h-20 w-32 flex-col items-center justify-center rounded-2xl border border-white/20 bg-[#06183a] px-2 shadow-[inset_0_0_18px_rgba(255,255,255,.08),0_10px_24px_rgba(0,0,0,.25)]">
                        <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.22em] text-[#D4A017]">Hora</span>
                        <span className="relative z-10 mt-1 rounded-lg bg-white px-2.5 py-1 text-2xl font-black leading-none text-[#06183a] shadow-sm">{new Date(p.match_date).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="relative z-10 mt-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-white">VS</span>
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-[24px] font-black uppercase leading-tight">{p.away?.name || "Visitante"}</p>
                      </div>
                      <div className="flex justify-center">
                        {p.away?.shield_url ? <Image src={p.away.shield_url} alt={`Escudo de ${p.away.name}`} width={72} height={72} unoptimized crossOrigin="anonymous" className="h-[72px] w-[72px] object-contain drop-shadow-lg" /> : <div className="h-[72px] w-[72px] rounded-full bg-[#dbeafe]" />}
                      </div>
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[#D4A017]/60 bg-[#06183a] px-5 py-1 text-[12px] font-black uppercase tracking-widest text-white shadow-lg">
                        {new Date(p.match_date).toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" })} - {p.court || "Cancha por confirmar"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="relative z-10 mt-12 grid grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <p className="text-4xl font-black italic tracking-wide text-white drop-shadow-[0_4px_0_rgba(0,0,0,.65)]">{torneoNombre}</p>
              <p className="mt-2 text-xl font-black uppercase tracking-[0.2em] text-[#D4A017]">{sedePrincipalProgramacion()}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/30 px-5 py-4 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D4A017]">Organizacion</p>
              <p className="text-2xl font-black uppercase">Game-Legal Pro</p>
            </div>
          </div>
          {auspiciantesTorneo.length > 0 && (
            <div className="relative z-10 mt-8 rounded-2xl border border-white/15 bg-black/30 p-4">
              <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.35em] text-[#D4A017]">Auspiciantes oficiales</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {auspiciantesTorneo.map((sponsor, index) => (
                  <span key={`${sponsor}-${index}`} className="rounded-full border border-[#D4A017]/40 bg-white/10 px-4 py-1 text-[11px] font-black uppercase tracking-widest text-white">{sponsor}</span>
                ))}
              </div>
            </div>
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
          {auspiciantesTorneo.length > 0 && (
            <div className="mx-10 mt-6 rounded-xl border border-[#2E2E2E] bg-[#141414]/90 p-4">
              <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.35em] text-[#D4A017]">Auspiciantes oficiales</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {auspiciantesTorneo.map((sponsor, index) => (
                  <span key={`${sponsor}-${index}`} className="rounded-full border border-[#D4A017]/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">{sponsor}</span>
                ))}
              </div>
            </div>
          )}
          <div className="text-center mt-6">
             <p className="text-gray-500 text-xs tracking-[0.3em] uppercase">Powered by GAME-LEGAL PRO</p>
          </div>
        </div>
      </div>
    </div>
  );
}
