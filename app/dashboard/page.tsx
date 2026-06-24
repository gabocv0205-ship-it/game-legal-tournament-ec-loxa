"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useTournamentData } from "./useTournamentData";

type Standing = {
  id: string;
  name: string;
  shield_url?: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  gd: number;
  pts: number;
};

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-[#2E2E2E] bg-[#141414]/95 shadow-[0_18px_50px_rgba(0,0,0,.28)] ${className}`}>
    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#D4A017]/10 blur-3xl" />
    <div className="relative z-10">{children}</div>
  </div>
);

const MetricCard = ({ label, value, sub, tone = "gold" }: { label: string; value: React.ReactNode; sub: string; tone?: "gold" | "green" | "red" | "blue" }) => {
  const colors = {
    gold: "text-[#D4A017] border-[#D4A017]/35 bg-[#D4A017]/10",
    green: "text-green-400 border-green-500/35 bg-green-500/10",
    red: "text-red-400 border-red-500/35 bg-red-500/10",
    blue: "text-blue-300 border-blue-500/35 bg-blue-500/10",
  };
  return (
    <div className="rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-5">
      <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${colors[tone]}`}>{label}</div>
      <div className="text-3xl font-black text-white">{value}</div>
      <p className="mt-2 text-xs font-bold text-gray-500">{sub}</p>
    </div>
  );
};

function buildStandings(teams: any[], matches: any[]): Standing[] {
  const table = new Map<string, Standing>();
  teams.forEach(team => {
    table.set(team.id, { id: team.id, name: team.name, shield_url: team.shield_url, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, gd: 0, pts: 0 });
  });

  matches.filter(match => match.status === "finished").forEach(match => {
    const home = table.get(match.home_team_id);
    const away = table.get(match.away_team_id);
    if (!home || !away) return;
    const hg = Number(match.home_goals || 0);
    const ag = Number(match.away_goals || 0);
    home.pj += 1; away.pj += 1;
    home.gf += hg; home.gc += ag;
    away.gf += ag; away.gc += hg;
    if (hg > ag) { home.pg += 1; away.pp += 1; home.pts += 3; }
    else if (ag > hg) { away.pg += 1; home.pp += 1; away.pts += 3; }
    else { home.pe += 1; away.pe += 1; home.pts += 1; away.pts += 1; }
  });

  return Array.from(table.values())
    .map(team => ({ ...team, gd: team.gf - team.gc }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
}

export default function DashboardInicio() {
  const { players, teams, matches, stats, disciplinaryAlerts, loading, tournamentId, tournamentName } = useTournamentData();
  const [misTorneos, setMisTorneos] = useState<any[]>([]);
  const [torneoActivoId, setTorneoActivoId] = useState<string | null>(null);
  const [newsIndex, setNewsIndex] = useState(0);

  useEffect(() => {
    const fetchTorneos = async () => {
      const storedId = localStorage.getItem("activeTournamentId");
      setTorneoActivoId(storedId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      const query = supabase.from("tournaments").select("id, name").order("created_at", { ascending: false });
      const { data } = profile?.role === "superadmin" ? await query : await query.eq("user_id", session.user.id);
      setMisTorneos(data || []);
    };
    fetchTorneos();
  }, []);

  const cambiarTorneo = (nuevoId: string) => {
    localStorage.setItem("activeTournamentId", nuevoId);
    const name = misTorneos.find(t => t.id === nuevoId)?.name;
    if (name) localStorage.setItem("activeTournamentName", name);
    window.dispatchEvent(new Event("tournamentChanged"));
    window.location.reload();
  };

  const dashboard = useMemo(() => {
    const standings = buildStandings(teams || [], matches || []);
    const finished = (matches || []).filter((match: any) => match.status === "finished");
    const pending = (matches || []).filter((match: any) => match.status !== "finished");
    const scheduledPending = pending.filter((match: any) => match.match_date);
    const unscheduled = pending.filter((match: any) => !match.match_date);
    const upcoming = scheduledPending.sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()).slice(0, 5);
    const latest = finished.sort((a: any, b: any) => new Date(b.match_date || b.updated_at || 0).getTime() - new Date(a.match_date || a.updated_at || 0).getTime()).slice(0, 4);
    const progress = matches?.length ? Math.round((finished.length / matches.length) * 100) : 0;
    const leader = standings[0];
    const bestDefense = standings.filter(team => team.pj > 0).sort((a, b) => a.gc - b.gc || b.pts - a.pts)[0];
    const topScorer = [...(players || [])].sort((a: any, b: any) => Number(b.goals || b.total_goals || 0) - Number(a.goals || a.total_goals || 0))[0];
    const nextRound = stats?.nextMatchday ? `Fecha ${stats.nextMatchday}` : pending.length ? "Por programar" : "Completado";
    const stage = pending.length === 0 && matches?.length ? "Torneo finalizado" : stats?.nextMatchday ? "Fase activa" : tournamentId ? "Preparacion" : "Sin torneo seleccionado";
    const news = [
      stats?.suspended ? `${stats.suspended} jugador(es) suspendidos para la siguiente fecha.` : "",
      stats?.debts ? `${stats.debts} equipo(s) con alertas financieras.` : "",
      upcoming[0] ? `Proximo partido: ${upcoming[0].home?.name || "Local"} vs ${upcoming[0].away?.name || "Visitante"}.` : "",
      leader ? `${leader.name} lidera la tabla con ${leader.pts} punto(s).` : "",
      latest[0] ? `Ultimo resultado: ${latest[0].home?.name || "Local"} ${latest[0].home_goals ?? 0} - ${latest[0].away_goals ?? 0} ${latest[0].away?.name || "Visitante"}.` : "",
    ].filter(Boolean);

    return { standings, finished, pending, unscheduled, upcoming, latest, progress, leader, bestDefense, topScorer, nextRound, stage, news };
  }, [matches, players, stats, teams, tournamentId]);

  useEffect(() => {
    if (!dashboard.news.length) return;
    const timer = setInterval(() => setNewsIndex(index => (index + 1) % dashboard.news.length), 4500);
    return () => clearInterval(timer);
  }, [dashboard.news.length]);

  if (loading) return <div className="p-10 text-center font-black text-[#D4A017] animate-pulse">Sincronizando centro de control...</div>;

  if (!tournamentId) {
    return (
      <div className="mx-auto max-w-5xl">
        <Panel className="p-8 md:p-12 text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4A017]">Centro de control</p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">Selecciona un torneo</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-bold leading-7 text-gray-400">Para ver indicadores deportivos, alertas, calendario y novedades, primero elige el torneo que vas a gestionar desde Mis Torneos.</p>
        </Panel>
      </div>
    );
  }

  const torneoActual = misTorneos.find(t => t.id === torneoActivoId);
  const activeNews = dashboard.news[newsIndex % Math.max(1, dashboard.news.length)];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Panel className="p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#D4A017]/35 bg-[#D4A017]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#D4A017]">Inicio inteligente</span>
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-green-400">{dashboard.stage}</span>
            </div>
            <h1 className="break-words text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl">{torneoActual?.name || tournamentName || "Torneo Oficial"}</h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-gray-400">Vista ejecutiva del torneo: estado deportivo, alertas, proximos encuentros y avance general en un solo lugar.</p>
          </div>
          <div className="rounded-2xl border border-[#D4A017]/30 bg-[#0a0a0a] p-4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Gestionando torneo</label>
            <select value={torneoActivoId || ""} onChange={event => cambiarTorneo(event.target.value)} className="w-full rounded-xl border border-[#2E2E2E] bg-[#141414] p-3 text-sm font-black text-white outline-none focus:border-[#D4A017]">
              <option value="" disabled>Seleccione un torneo...</option>
              {misTorneos.map(torneo => <option key={torneo.id} value={torneo.id}>{torneo.name}</option>)}
            </select>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500"><span>Avance</span><span>{dashboard.progress}%</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-[#1C1C1C]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#D4A017] to-yellow-300 transition-all" style={{ width: `${dashboard.progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Equipos" value={teams.length} sub="Inscritos" />
        <MetricCard label="Jugadores" value={players.length} sub="Registrados" tone="blue" />
        <MetricCard label="Jugados" value={dashboard.finished.length} sub="Partidos finalizados" tone="green" />
        <MetricCard label="Pendientes" value={dashboard.pending.length} sub={`${dashboard.unscheduled.length} sin programar`} />
        <MetricCard label="Alertas" value={(stats?.suspended || 0) + (stats?.debts || 0)} sub="Disciplina y finanzas" tone={(stats?.suspended || stats?.debts) ? "red" : "green"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4A017]">Estado del torneo</p>
              <h2 className="text-2xl font-black uppercase text-white">{dashboard.nextRound}</h2>
            </div>
            <span className="rounded-full bg-[#D4A017] px-3 py-1 text-[10px] font-black uppercase text-black">{dashboard.progress}%</span>
          </div>
          <div className="space-y-3">
            {dashboard.upcoming.length === 0 ? <p className="rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4 text-sm font-bold text-gray-500">No hay proximos encuentros programados.</p> : dashboard.upcoming.map(match => (
              <div key={match.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black uppercase text-white">{match.home?.name || "Local"} vs {match.away?.name || "Visitante"}</p>
                  <p className="mt-1 text-xs font-bold text-gray-500">Fecha {match.matchday || "-"} · {match.court_name || "Cancha por definir"}</p>
                </div>
                <span className="rounded-xl border border-[#D4A017]/35 bg-[#D4A017]/10 px-3 py-2 text-xs font-black text-[#D4A017]">{match.match_date ? new Date(match.match_date).toLocaleString("es-EC") : "Sin hora"}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5 md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4A017]">Novedades automaticas</p>
          <div className="mt-4 rounded-3xl border border-[#D4A017]/30 bg-gradient-to-br from-[#1C1C1C] to-[#0a0a0a] p-6 min-h-36 flex items-center">
            <p className="text-xl font-black leading-8 text-white">{activeNews || "Sin novedades criticas por ahora."}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AlertList title="Suspendidos" items={disciplinaryAlerts.suspended} empty="Sin suspendidos" />
            <AlertList title="Habilitados" items={disciplinaryAlerts.eligibleAgain} empty="Sin retornos" />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel className="p-5 md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4A017]">Resumen deportivo</p>
          <div className="mt-5 space-y-4">
            <Highlight label="Lider de tabla" value={dashboard.leader?.name || "Sin datos"} detail={dashboard.leader ? `${dashboard.leader.pts} pts · GD ${dashboard.leader.gd}` : "Pendiente"} shield={dashboard.leader?.shield_url} />
            <Highlight label="Mejor defensa" value={dashboard.bestDefense?.name || "Sin datos"} detail={dashboard.bestDefense ? `${dashboard.bestDefense.gc} goles en contra` : "Pendiente"} shield={dashboard.bestDefense?.shield_url} />
            <Highlight label="Goleador" value={dashboard.topScorer?.full_name || "Sin datos"} detail={`${Number(dashboard.topScorer?.goals || dashboard.topScorer?.total_goals || 0)} gol(es)`} shield={dashboard.topScorer?.teams?.shield_url} />
          </div>
        </Panel>

        <Panel className="p-5 md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4A017]">Ultimos resultados</p>
          <div className="mt-5 space-y-3">
            {dashboard.latest.length === 0 ? <p className="text-sm font-bold text-gray-500">Aun no existen resultados finalizados.</p> : dashboard.latest.map(match => (
              <div key={match.id} className="rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4">
                <p className="text-sm font-black uppercase text-white">{match.home?.name || "Local"} {match.home_goals ?? 0} - {match.away_goals ?? 0} {match.away?.name || "Visitante"}</p>
                <p className="mt-1 text-xs font-bold text-gray-500">Fecha {match.matchday || "-"} · Finalizado</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5 md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4A017]">Timeline</p>
          <div className="mt-5 space-y-4">
            {[
              ["Configuracion", teams.length > 0],
              ["Sorteo / grupos", teams.some((team: any) => team.group_name)],
              ["Calendario", matches.length > 0],
              ["Resultados", dashboard.finished.length > 0],
              ["Cierre", dashboard.progress === 100 && matches.length > 0],
            ].map(([label, done], index) => (
              <div key={String(label)} className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black ${done ? "border-green-500 bg-green-500 text-black" : "border-[#2E2E2E] bg-[#0a0a0a] text-gray-500"}`}>{index + 1}</div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase text-white">{label}</p>
                  <p className="text-xs font-bold text-gray-500">{done ? "Completado / activo" : "Pendiente"}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AlertList({ title, items, empty }: { title: string; items: any[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-xs font-bold text-gray-600">{empty}</p> : items.slice(0, 4).map(item => (
          <p key={item.id} className="truncate text-xs font-bold text-white">{item.name} <span className="text-gray-500">· {item.team}</span></p>
        ))}
      </div>
    </div>
  );
}

function Highlight({ label, value, detail, shield }: { label: string; value: string; detail: string; shield?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#2E2E2E] bg-[#141414]">
        {shield ? <Image src={shield} alt={value} width={48} height={48} unoptimized className="h-full w-full object-contain p-1" /> : <span className="text-xs font-black text-[#D4A017]">GL</span>}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#D4A017]">{label}</p>
        <p className="truncate text-sm font-black uppercase text-white">{value}</p>
        <p className="text-xs font-bold text-gray-500">{detail}</p>
      </div>
    </div>
  );
}
