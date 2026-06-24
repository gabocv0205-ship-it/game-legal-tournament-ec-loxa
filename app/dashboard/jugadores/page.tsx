"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";

export default function JugadoresPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [partidosEventos, setPartidosEventos] = useState<Record<string, any>>({});
  const [plantillaAutomatica, setPlantillaAutomatica] = useState(false);
  const [maxJugadoresEquipo, setMaxJugadoresEquipo] = useState(25);
  const [reglas, setReglas] = useState({ amarillasSuspension: 3, partidosAmarillas: 1, partidosRoja: 1 });
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [jugadorPerfil, setJugadorPerfil] = useState<any>(null);

  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [cedulaEditada, setCedulaEditada] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargandoDatos(true);
    try {
      const activeId = typeof window !== "undefined" ? localStorage.getItem("activeTournamentId") : null;

      if (!activeId) {
        setCargandoDatos(false);
        return;
      }

      const tournament = await getAccessibleTournament(
        supabase,
        activeId,
        "id, is_auto_template_enabled, max_players_per_team, yellow_cards_for_suspension, yellow_suspension_matches, red_suspension_matches",
      );

      if (!tournament) {
        clearActiveTournament();
        setTorneoId(null);
        setJugadores([]);
        setEquipos([]);
        setEventos([]);
        setPartidosEventos({});
        setCargandoDatos(false);
        return;
      }

      setTorneoId(activeId);
      setPlantillaAutomatica(Boolean(tournament.is_auto_template_enabled));
      setMaxJugadoresEquipo(Number(tournament.max_players_per_team || 25));
      setReglas({
        amarillasSuspension: Number(tournament.yellow_cards_for_suspension || 3),
        partidosAmarillas: Number(tournament.yellow_suspension_matches || 1),
        partidosRoja: Number(tournament.red_suspension_matches || 1),
      });

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("tournament_id", activeId)
        .order("name");
      setEquipos(teamsData || []);

      const { data: playersData } = await supabase
        .from("players")
        .select("*, teams(name)")
        .eq("tournament_id", activeId)
        .order("created_at", { ascending: false });
      setJugadores(playersData || []);

      const playerIds = (playersData || []).map((player) => player.id);
      if (!playerIds.length) {
        setEventos([]);
        setPartidosEventos({});
        return;
      }

      const { data: eventsData } = await supabase
        .from("match_events")
        .select("id, match_id, player_id, team_id, event_type, minute, created_at")
        .in("player_id", playerIds)
        .order("created_at", { ascending: false });
      setEventos(eventsData || []);

      const matchIds = Array.from(new Set((eventsData || []).map((event) => event.match_id).filter(Boolean)));
      if (!matchIds.length) {
        setPartidosEventos({});
        return;
      }

      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, matchday, match_date, status, home_team_id, away_team_id, home_goals, away_goals, home:home_team_id(name), away:away_team_id(name)")
        .in("id", matchIds);
      setPartidosEventos(Object.fromEntries((matchesData || []).map((match) => [match.id, match])));
    } catch (error) {
      console.error("Error al cargar jugadores:", error);
    } finally {
      setCargandoDatos(false);
    }
  };

  const guardarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torneoId) return alert("Error: No hay un torneo activo seleccionado.");

    setLoading(true);
    try {
      const nombreLimpio = nombre.trim();
      const cedulaLimpia = cedula.trim();
      if (!nombreLimpio || !cedulaLimpia) throw new Error("La cedula y el nombre completo son obligatorios.");

      const { error } = await supabase.rpc("register_tournament_player", {
        p_tournament_id: torneoId,
        p_team_id: equipoId,
        p_full_name: nombreLimpio,
        p_cedula: cedulaLimpia,
      });

      if (error) {
        if (error.message.includes("unique") || error.message.includes("cedula")) {
          throw new Error("Esta cedula ya esta registrada en el torneo actual.");
        }
        throw error;
      }

      setNombre("");
      setCedula("");
      cargarDatos();
      alert("Jugador registrado con exito.");
    } catch (error: any) {
      alert("Aviso: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarJugador = async (id: string) => {
    if (!window.confirm("Eliminar a este jugador del torneo?")) return;
    try {
      const { error } = await supabase.rpc("delete_tournament_player", { p_player_id: id });
      if (error) throw error;
      cargarDatos();
    } catch (error: any) {
      alert("Error al eliminar: " + error.message);
    }
  };

  const guardarEdicion = async (id: string) => {
    try {
      const { error } = await supabase.rpc("update_tournament_player", {
        p_player_id: id,
        p_full_name: nombreEditado.trim(),
        p_cedula: cedulaEditada.trim(),
      });

      if (error) {
        if (error.message.includes("unique") || error.message.includes("cedula")) {
          throw new Error("Esta cedula ya pertenece a otro jugador en este torneo.");
        }
        throw error;
      }

      setEditandoId(null);
      cargarDatos();
    } catch (error: any) {
      alert("Aviso: " + error.message);
    }
  };

  const obtenerEstadisticasJugador = (jugador: any) => {
    const historial = eventos.filter((evento) => evento.player_id === jugador.id);
    const goles = historial.filter((evento) => evento.event_type === "gol").length;
    const amarillas = historial.filter((evento) => evento.event_type === "amarilla").length;
    const rojas = historial.filter((evento) => evento.event_type === "roja").length;
    const mvp = historial.filter((evento) => evento.event_type === "mvp").length;
    const suspensionesPorAmarillas = Math.floor(amarillas / Math.max(1, reglas.amarillasSuspension)) * reglas.partidosAmarillas;
    const suspensionesPorRojas = rojas * reglas.partidosRoja;

    return {
      historial,
      goles,
      amarillas,
      rojas,
      mvp,
      suspensiones: suspensionesPorAmarillas + suspensionesPorRojas,
    };
  };

  const jugadoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return jugadores.filter((jugador) => {
      const coincideEquipo = !filtroEquipo || jugador.team_id === filtroEquipo;
      const coincideBusqueda = !termino
        || String(jugador.full_name || "").toLowerCase().includes(termino)
        || String(jugador.cedula || "").toLowerCase().includes(termino)
        || String(jugador.teams?.name || "").toLowerCase().includes(termino);
      return coincideEquipo && coincideBusqueda;
    });
  }, [busqueda, filtroEquipo, jugadores]);

  const jugadoresPorEquipo = useMemo(() => {
    const grupos = equipos
      .filter((equipo) => !filtroEquipo || equipo.id === filtroEquipo)
      .map((equipo) => ({
        equipo,
        jugadores: jugadoresFiltrados
          .filter((jugador) => jugador.team_id === equipo.id)
          .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""))),
      }))
      .filter((grupo) => grupo.jugadores.length > 0 || (!busqueda && filtroEquipo === grupo.equipo.id));

    const sinEquipo = jugadoresFiltrados.filter((jugador) => !jugador.team_id);
    if (sinEquipo.length) grupos.push({ equipo: { id: "sin-equipo", name: "Sin equipo" }, jugadores: sinEquipo });
    return grupos;
  }, [busqueda, equipos, filtroEquipo, jugadoresFiltrados]);

  if (cargandoDatos) {
    return <div className="p-20 text-center font-black text-[#D4A017] animate-pulse">Sincronizando plantilla de jugadores...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black uppercase tracking-wider text-white">Gestion de Jugadores</h2>
        <p className="mt-1 text-sm text-gray-400">Administra la nomina oficial del torneo seleccionado.</p>
      </div>

      <div className={`rounded-xl border p-4 text-sm ${plantillaAutomatica ? "border-cyan-500/40 bg-cyan-950/30 text-cyan-200" : "border-[#2E2E2E] bg-[#141414] text-gray-400"}`}>
        <strong className="text-xs uppercase tracking-widest">{plantillaAutomatica ? "Control estricto activo" : "Plantilla oficial opcional"}</strong>
        <p className="mt-1">
          {plantillaAutomatica
            ? `Cada equipo admite maximo ${maxJugadoresEquipo} jugadores oficiales. Una cedula no puede pertenecer a dos equipos del torneo.`
            : "Puedes registrar jugadores oficiales sin limite configurado. Las planillas abiertas por partido permanecen disponibles."}
        </p>
      </div>

      <div className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-6 shadow-lg">
        <form onSubmit={guardarJugador} className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Cedula / Pasaporte</label>
            <input type="text" value={cedula} onChange={(e) => setCedula(e.target.value)} required className="mt-1 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white focus:border-[#D4A017] focus:outline-none" placeholder="Ej: 1101234567" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Nombre Completo</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="mt-1 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white focus:border-[#D4A017] focus:outline-none" placeholder="Ej: Lionel Messi" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Asignar a Club</label>
            <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)} required className="mt-1 w-full cursor-pointer rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white focus:border-[#D4A017] focus:outline-none">
              <option value="" disabled>Selecciona un equipo...</option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({jugadores.filter((jugador) => jugador.team_id === eq.id).length}{plantillaAutomatica ? `/${maxJugadoresEquipo}` : ""})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#D4A017] py-3 font-black uppercase text-black shadow-[0_0_15px_rgba(212,160,23,0.3)] transition-all hover:bg-yellow-500 md:col-span-3">
            {loading ? "Guardando..." : "Registrar Jugador Oficial"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#2E2E2E] bg-[#141414] p-4 md:grid-cols-[1fr_280px]">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Buscar jugador</label>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="mt-1 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white focus:border-[#D4A017] focus:outline-none" placeholder="Nombre, cedula o equipo" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Filtrar por equipo</label>
          <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className="mt-1 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white focus:border-[#D4A017] focus:outline-none">
            <option value="">Todos los equipos</option>
            {equipos.map((equipo) => <option key={equipo.id} value={equipo.id}>{equipo.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-5">
        {jugadores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2E2E2E] bg-[#141414] p-8 text-center font-bold italic text-gray-500">
            No hay jugadores registrados en este torneo.
          </div>
        ) : jugadoresPorEquipo.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2E2E2E] bg-[#141414] p-8 text-center font-bold italic text-gray-500">
            No se encontraron jugadores con los filtros actuales.
          </div>
        ) : (
          jugadoresPorEquipo.map((grupo) => (
            <section key={grupo.equipo.id} className="overflow-hidden rounded-2xl border border-[#2E2E2E] bg-[#1C1C1C] shadow-xl">
              <div className="flex flex-col gap-2 border-b border-[#2E2E2E] bg-[#0a0a0a] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wider text-white">{grupo.equipo.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Jugadores agrupados por equipo</p>
                </div>
                <span className="rounded-full border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#D4A017]">
                  {grupo.jugadores.length}{plantillaAutomatica ? `/${maxJugadoresEquipo}` : ""} jugadores
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                {grupo.jugadores.map((jugador) => {
                  const resumen = obtenerEstadisticasJugador(jugador);
                  const enEdicion = editandoId === jugador.id;

                  return (
                    <article key={jugador.id} className="rounded-2xl border border-[#2E2E2E] bg-[#111] p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          {enEdicion ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <input type="text" value={cedulaEditada} onChange={(e) => setCedulaEditada(e.target.value)} className="rounded-lg border border-[#D4A017] bg-[#0a0a0a] p-2 text-sm text-white outline-none" />
                              <input type="text" value={nombreEditado} onChange={(e) => setNombreEditado(e.target.value)} className="rounded-lg border border-[#D4A017] bg-[#0a0a0a] p-2 text-sm text-white outline-none" />
                            </div>
                          ) : (
                            <>
                              <p className="truncate text-lg font-black uppercase text-white">{jugador.full_name}</p>
                              <p className="font-mono text-xs text-gray-400">ID: {jugador.cedula}</p>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          {enEdicion ? (
                            <>
                              <button onClick={() => guardarEdicion(jugador.id)} className="rounded-full bg-green-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-green-400 hover:bg-green-500/25">Guardar</button>
                              <button onClick={() => setEditandoId(null)} className="rounded-full bg-gray-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-300 hover:bg-gray-500/25">Cancelar</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setJugadorPerfil(jugador)} className="rounded-full bg-[#D4A017] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black hover:bg-yellow-500">Perfil</button>
                              <button onClick={() => { setEditandoId(jugador.id); setNombreEditado(jugador.full_name); setCedulaEditada(jugador.cedula); }} className="rounded-full bg-[#D4A017]/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#D4A017] hover:bg-[#D4A017]/25">Editar</button>
                              <button onClick={() => eliminarJugador(jugador.id)} className="rounded-full bg-red-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-400 hover:bg-red-500/25">Eliminar</button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <MiniStat label="Goles" value={resumen.goles} />
                        <MiniStat label="Amarillas" value={resumen.amarillas} tone="yellow" />
                        <MiniStat label="Rojas" value={resumen.rojas} tone="red" />
                        <MiniStat label="Susp." value={resumen.suspensiones} tone="cyan" />
                        <MiniStat label="Eventos" value={resumen.historial.length} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {jugadorPerfil && (
        <PlayerProfileModal
          jugador={jugadorPerfil}
          stats={obtenerEstadisticasJugador(jugadorPerfil)}
          partidosEventos={partidosEventos}
          onClose={() => setJugadorPerfil(null)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "yellow" | "red" | "cyan" }) {
  const tones = {
    neutral: "border-[#2E2E2E] bg-[#0a0a0a] text-white",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <div className={`rounded-xl border p-3 text-center ${tones[tone]}`}>
      <p className="text-lg font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
    </div>
  );
}

function PlayerProfileModal({ jugador, stats, partidosEventos, onClose }: { jugador: any; stats: any; partidosEventos: Record<string, any>; onClose: () => void }) {
  const etiquetaEvento: Record<string, string> = {
    gol: "Gol",
    amarilla: "Amonestacion",
    roja: "Expulsion",
    mvp: "MVP",
  };

  const colorEvento: Record<string, string> = {
    gol: "text-green-300 border-green-500/30 bg-green-500/10",
    amarilla: "text-yellow-300 border-yellow-500/30 bg-yellow-500/10",
    roja: "text-red-300 border-red-500/30 bg-red-500/10",
    mvp: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#D4A017]/30 bg-[#111] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#2E2E2E] bg-[#0a0a0a] p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D4A017]">Perfil del jugador</p>
            <h3 className="mt-1 text-2xl font-black uppercase text-white">{jugador.full_name}</h3>
            <p className="mt-1 text-sm text-gray-400">{jugador.teams?.name || "Sin equipo"} - Cedula {jugador.cedula}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#2E2E2E] px-4 py-2 text-xs font-black uppercase text-gray-300 hover:border-[#D4A017] hover:text-[#D4A017]">Cerrar</button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-5">
          <ProfileMetric label="Goles" value={stats.goles} />
          <ProfileMetric label="Amonestaciones" value={stats.amarillas} tone="yellow" />
          <ProfileMetric label="Expulsiones" value={stats.rojas} tone="red" />
          <ProfileMetric label="Suspensiones" value={stats.suspensiones} tone="cyan" />
          <ProfileMetric label="Eventos" value={stats.historial.length} />
        </div>

        <div className="px-5 pb-5">
          <h4 className="mb-3 text-sm font-black uppercase tracking-widest text-white">Historial del torneo</h4>
          {stats.historial.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2E2E2E] p-6 text-center text-sm font-bold text-gray-500">
              Todavia no registra goles, sanciones o eventos deportivos en este torneo.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.historial.map((evento: any) => {
                const partido = partidosEventos[evento.match_id];
                const marcador = partido?.status === "finished" ? ` - ${partido.home_goals ?? 0}-${partido.away_goals ?? 0}` : "";

                return (
                  <div key={evento.id} className="rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${colorEvento[evento.event_type] || "border-[#2E2E2E] text-gray-300"}`}>
                        {etiquetaEvento[evento.event_type] || evento.event_type}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                        {evento.minute ? `Min ${evento.minute}'` : "Sin minuto registrado"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-white">
                      {partido
                        ? `${partido.home?.name || "Local"} vs ${partido.away?.name || "Visitante"}${marcador}`
                        : "Partido no disponible"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Fecha {partido?.matchday || "-"} {partido?.match_date ? `- ${new Date(partido.match_date).toLocaleDateString("es-EC")}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "yellow" | "red" | "cyan" }) {
  return (
    <div className="rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4 text-center">
      <MiniStat label={label} value={value} tone={tone} />
    </div>
  );
}
