"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { QRCodeCanvas } from "qrcode.react";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";
import AudioExperienceControls from "@/components/AudioExperienceControls";
import { playAudioEffect } from "@/lib/audioExperience";

export default function SorteoPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [numGrupos, setNumGrupos] = useState<number>(4);
  const [nombreTorneo, setNombreTorneo] = useState("Torneo Oficial");
  const [torneoSlug, setTorneoSlug] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [fondoPosterUrl, setFondoPosterUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [modoPresentacion, setModoPresentacion] = useState(false);
  const [sorteoEnVivo, setSorteoEnVivo] = useState(false);
  const [equipoRevelado, setEquipoRevelado] = useState<any>(null);
  const [grupoRevelado, setGrupoRevelado] = useState("");
  const [historialSorteos, setHistorialSorteos] = useState<any[]>([]);
  
  // Referencia para capturar la imagen
  const capturaRef = useRef<HTMLDivElement>(null);

  const letrasGrupos = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    cargarEquipos();
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, []);

  const cargarEquipos = async () => {
    const activeId = typeof window !== "undefined" ? localStorage.getItem("activeTournamentId") : null;
    if (!activeId) return setMensaje("Selecciona primero un torneo desde Mis Torneos.");
    setLoading(true);
    setMensaje("");
    const tournament = await getAccessibleTournament(supabase, activeId, "id, name, slug, group_count, match_poster_background_url");
    if (!tournament) {
      clearActiveTournament();
      setEquipos([]);
      setLoading(false);
      return setMensaje("No tienes acceso a ese torneo. Selecciona un torneo propio desde Mis Torneos.");
    }
    const [teamsResult, drawLogsResult] = await Promise.all([
      supabase.from("teams").select("id, name, shield_url, group_name, tournament_id").eq("tournament_id", activeId).order("name"),
      supabase.from("draw_history").select("*").eq("tournament_id", activeId).order("created_at", { ascending: false }).limit(8),
    ]);
    setTorneoId(activeId);
    setNombreTorneo(tournament.name || "Torneo Oficial");
    setTorneoSlug(tournament.slug || "");
    setNumGrupos(Math.max(2, Number(tournament.group_count || 4)));
    setFondoPosterUrl(tournament.match_poster_background_url || "");
    if (teamsResult.error) {
      setEquipos([]);
      setMensaje(`No se pudieron cargar los equipos: ${teamsResult.error.message}`);
    } else {
      setEquipos(teamsResult.data || []);
      if (!teamsResult.data?.length) setMensaje("Este torneo todavía no tiene equipos registrados.");
    }
    setHistorialSorteos(drawLogsResult.data || []);
    setLoading(false);
  };

  const sorteoAutomatico = async () => {
    if (!window.confirm(`¿Sortear automáticamente a los ${equipos.length} equipos en ${numGrupos} grupos?`)) return;
    setLoading(true);

    setSorteoEnVivo(true);
    setEquipoRevelado(null);
    setGrupoRevelado("");
    await playAudioEffect("draw_start");
    await playAudioEffect("drum_roll");

    let equiposMezclados = [...equipos];
    for (let i = equiposMezclados.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [equiposMezclados[i], equiposMezclados[j]] = [equiposMezclados[j], equiposMezclados[i]];
    }

    for (let index = 0; index < Math.min(equiposMezclados.length, 8); index++) {
      const equipo = equiposMezclados[index];
      const grupoAsignado = letrasGrupos[index % numGrupos];
      setEquipoRevelado(equipo);
      setGrupoRevelado(`Grupo ${grupoAsignado}`);
      await esperar(index === 0 ? 1200 : 520);
      await playAudioEffect("team_pick");
      await esperar(260);
      await playAudioEffect("group_assign");
    }

    const actualizaciones = equiposMezclados.map((equipo, index) => {
      const grupoAsignado = letrasGrupos[index % numGrupos];
      return supabase.from("teams").update({ group_name: grupoAsignado }).eq("id", equipo.id);
    });

    try {
      const resultados = await Promise.all(actualizaciones);
      const error = resultados.find(resultado => resultado.error)?.error;
      if (error) throw error;
      if (torneoId) {
        const resultPayload = equiposMezclados.map((equipo, index) => ({
          team_id: equipo.id,
          team_name: equipo.name,
          group_name: letrasGrupos[index % numGrupos],
        }));
        await supabase.from("draw_history").insert([{
          tournament_id: torneoId,
          mode: "automatic",
          title: `Sorteo automático ${new Date().toLocaleString("es-EC")}`,
          seed: String(Date.now()),
          result: resultPayload,
          pots: { total_teams: equiposMezclados.length, group_count: numGrupos },
        }]);
      }
      await playAudioEffect("confirm");
      await cargarEquipos();
    } catch (error: any) {
      alert(`Error al realizar el sorteo: ${error.message || "operación bloqueada"}`);
    } finally {
      setSorteoEnVivo(false);
      setLoading(false);
    }
  };

  const cambiarGrupoManual = async (equipoId: string, nuevoGrupo: string) => {
    try {
      const { error } = await supabase.from("teams").update({ group_name: nuevoGrupo === "Libre" ? null : nuevoGrupo }).eq("id", equipoId);
      if (error) throw error;
      await cargarEquipos();
    } catch (error: any) {
      alert(`Error al asignar grupo: ${error.message || "operación bloqueada"}`);
    }
  };

  const limpiarSorteo = async () => {
    if (!window.confirm("¿Seguro que deseas vaciar todos los grupos?")) return;
    setLoading(true);
    const actualizaciones = equipos.map(equipo => supabase.from("teams").update({ group_name: null }).eq("id", equipo.id));
    try {
      const resultados = await Promise.all(actualizaciones);
      const error = resultados.find(resultado => resultado.error)?.error;
      if (error) throw error;
      await cargarEquipos();
    } catch (error: any) {
      alert(`Error al limpiar: ${error.message || "operación bloqueada"}`);
    } finally {
      setLoading(false);
    }
  };

  // 📸 FUNCIÓN: Exportar a Imagen para Redes
  const descargarImagen = async () => {
    if (!capturaRef.current) return;
    setLoading(true);
    const poster = capturaRef.current;
    const previousStyle = {
      width: poster.style.width,
      minWidth: poster.style.minWidth,
      height: poster.style.height,
      minHeight: poster.style.minHeight,
    };
    try {
      poster.style.width = "1080px";
      poster.style.minWidth = "1080px";
      poster.style.height = "1080px";
      poster.style.minHeight = "1080px";
      await Promise.all(Array.from(poster.querySelectorAll("img")).map(image => {
        if (image.complete) return image.decode?.().catch(() => undefined);
        return new Promise<void>(resolve => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }));
      const canvas = await html2canvas(poster, {
        backgroundColor: "#0a0a0a",
        scale: 1,
        useCORS: true,
        width: 1080,
        height: 1080,
        windowWidth: 1080,
        windowHeight: 1080,
      });
      
      const socialCanvas = document.createElement("canvas");
      socialCanvas.width = 1080; socialCanvas.height = 1080;
      const context = socialCanvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar el póster");
      context.fillStyle = "#0a0a0a"; context.fillRect(0, 0, 1080, 1080);
      context.drawImage(canvas, 0, 0, 1080, 1080);
      const image = socialCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Sorteo-Oficial-${Date.now()}.png`;
      link.click();
    } catch (error: any) {
      alert(`Error al generar la imagen: ${error.message || "intenta nuevamente"}`);
    } finally {
      poster.style.width = previousStyle.width;
      poster.style.minWidth = previousStyle.minWidth;
      poster.style.height = previousStyle.height;
      poster.style.minHeight = previousStyle.minHeight;
      setLoading(false);
    }
  };

  const equiposPorGrupo = letrasGrupos.slice(0, numGrupos).map(letra => ({
    letra,
    equipos: equipos.filter(e => e.group_name === letra)
  }));
  const equiposLibres = equipos.filter(e => !e.group_name);
  const maxEquiposPorGrupo = Math.max(1, ...equiposPorGrupo.map(grupo => grupo.equipos.length));
  const columnasPoster = numGrupos <= 4 ? 2 : numGrupos <= 6 ? 3 : numGrupos <= 8 ? 4 : 5;
  const posterDenso = maxEquiposPorGrupo > 6 || numGrupos > 8;
  const posterCompacto = maxEquiposPorGrupo > 4 || numGrupos > 6;
  const tamanoEscudo = posterDenso ? 20 : posterCompacto ? 24 : 30;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#2E2E2E] pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">Sorteo y Fase de Grupos</h2>
          <p className="text-gray-400 font-bold text-sm mt-1">Total de Clubes Inscritos: <span className="text-[#D4A017]">{equipos.length}</span></p>
        </div>
        
        {/* Panel de Control del Sorteo */}
        <div className="flex flex-wrap items-center gap-3 bg-[#141414] p-3 rounded-xl border border-[#2E2E2E]">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Grupos:</label>
            <select value={numGrupos} onChange={e => setNumGrupos(Number(e.target.value))} className="bg-[#1C1C1C] text-[#D4A017] font-black border border-[#2E2E2E] rounded p-2 outline-none">
              {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button onClick={sorteoAutomatico} disabled={loading} className="bg-[#D4A017] text-black font-black uppercase text-xs px-4 py-2 rounded shadow-[0_0_15px_rgba(212,160,23,0.3)] hover:bg-yellow-500 transition-all">
            🎲 Sortear
          </button>
          <button onClick={() => setModoPresentacion(true)} disabled={loading} className="bg-[#1C1C1C] text-[#E7C36B] border border-[#D4A017]/50 font-black uppercase text-xs px-4 py-2 rounded hover:bg-[#D4A017] hover:text-black transition-all">
            PresentaciÃ³n
          </button>
          <button onClick={limpiarSorteo} disabled={loading} className="bg-red-900/30 text-red-500 border border-red-900 font-black uppercase text-xs px-4 py-2 rounded hover:bg-red-900 hover:text-white transition-all">
            Limpiar
          </button>
          {/* NUEVO BOTÓN DE DESCARGA */}
          <button onClick={descargarImagen} disabled={loading || equiposPorGrupo.every(g => g.equipos.length === 0)} className="bg-blue-600 text-white font-black uppercase text-xs px-4 py-2 rounded shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all ml-auto">
            📸 Descargar para Redes
          </button>
        </div>
      </div>
      <AudioExperienceControls label="Audio del sorteo" />
      {mensaje && <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm font-bold text-amber-200">{mensaje}</div>}
      {historialSorteos.length > 0 && (
        <div className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#D4A017]">Historial de sorteos</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {historialSorteos.map(item => (
              <div key={item.id} className="rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-xs">
                <p className="font-black uppercase text-white">{item.mode || "sorteo"}</p>
                <p className="mt-1 text-gray-500">{new Date(item.created_at).toLocaleString("es-EC")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`rounded-3xl border border-[#D4A017]/40 bg-gradient-to-br from-[#111827] via-[#050505] to-[#201504] p-6 shadow-2xl ${sorteoEnVivo ? "ring-2 ring-[#D4A017]/40" : ""}`}>
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className={`relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#D4A017] bg-[radial-gradient(circle,#3b2d0b,#050505_65%)] shadow-[0_0_45px_rgba(212,160,23,.35)] ${sorteoEnVivo ? "animate-spin" : ""}`}>
            <div className="absolute inset-5 rounded-full border border-white/10" />
            <div className="absolute h-2 w-28 rounded-full bg-[#D4A017]/80 blur-[1px]" />
            <span className="relative z-10 text-3xl font-black text-[#E7C36B]">GÂ·L</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D4A017]">Modo Sorteo Mundial</p>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-widest text-white">
              {equipoRevelado ? equipoRevelado.name : "Listo para revelar equipos"}
            </h3>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-gray-400">
              {grupoRevelado || "Activa el audio y presiona Sortear"}
            </p>
          </div>
        </div>
      </div>

      {/* EQUIPOS SIN ASIGNAR */}
      {equiposLibres.length > 0 && (
        <div className="bg-gradient-to-r from-[#141414] to-[#1a1a1a] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
          <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm mb-4">Equipos en el Bombo (Sin Grupo)</h3>
          <div className="flex flex-wrap gap-3">
            {equiposLibres.map(equipo => (
              <div key={equipo.id} className="flex items-center bg-[#1c1c1c] border border-[#2E2E2E] rounded-lg p-2 pr-4 gap-3">
                {equipo.shield_url ? (
                  <Image src={equipo.shield_url} alt={`Escudo de ${equipo.name}`} width={24} height={24} unoptimized crossOrigin="anonymous" className="w-6 h-6 object-contain rounded-full" />
                ) : (
                  <div className="w-6 h-6 bg-[#2E2E2E] rounded-full flex items-center justify-center text-[10px]">🛡️</div>
                )}
                <span className="text-white font-bold text-sm">{equipo.name}</span>
                <select onChange={e => cambiarGrupoManual(equipo.id, e.target.value)} className="ml-2 bg-black text-xs text-gray-400 border border-[#2E2E2E] rounded p-1">
                  <option value="">Asignar...</option>
                  {letrasGrupos.slice(0, numGrupos).map(l => <option key={l} value={l}>Grupo {l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZONA DE CAPTURA DE IMAGEN 
        Todo lo que esté dentro de este div (ref={capturaRef}) saldrá en la foto final.
      */}
      <div ref={capturaRef} className="p-8 bg-[#0a0a0a] rounded-xl relative overflow-hidden border-8 border-[#D4A017] flex flex-col" style={fondoPosterUrl ? { backgroundImage: `linear-gradient(rgba(10,10,10,.78), rgba(10,10,10,.9)), url("${fondoPosterUrl}")`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundImage: "radial-gradient(circle at 50% 25%, rgba(212,160,23,.18), transparent 34%), linear-gradient(145deg, #080808, #17130a 50%, #080808)" }}>
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full border-[18px] border-[#D4A017]/10" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full border-[22px] border-[#D4A017]/10" />
        <div className="absolute inset-4 rounded-2xl border border-[#D4A017]/20 pointer-events-none" />
        {/* Título solo visible en la imagen o al descargar */}
        <div className="relative text-center mb-7 pb-5 border-b border-[#2E2E2E]">
          <div className="absolute right-0 top-0 bg-[#1C1C1C] p-2 rounded-xl flex flex-col items-center shadow-2xl border border-[#D4A017]">
            {appUrl && torneoSlug && <QRCodeCanvas value={`${appUrl}/torneo/${torneoSlug}#posiciones`} size={90} level="H" fgColor="#D4A017" bgColor="#1C1C1C" />}
            <span className="text-[9px] text-white font-black uppercase mt-1">Tabla en vivo</span>
          </div>
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl border-2 border-[#D4A017] bg-gradient-to-br from-[#2b2412] to-[#0a0a0a] text-[#E7C36B] flex items-center justify-center text-xl font-black shadow-[0_0_30px_rgba(212,160,23,.35)]">G·L</div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase">{nombreTorneo}</h1>
          <p className="text-[#D4A017] font-bold text-sm tracking-widest uppercase mt-1">Conformación Oficial de Grupos</p>
        </div>

        <div className={`relative grid flex-1 content-center ${posterDenso ? "gap-2" : posterCompacto ? "gap-3" : "gap-4"}`} style={{ gridTemplateColumns: `repeat(${columnasPoster}, minmax(0, 1fr))` }}>
          {equiposPorGrupo.map(grupo => (
            <div key={grupo.letra} className="min-w-0 bg-[#141414]/90 rounded-xl border border-[#D4A017]/55 overflow-hidden shadow-[0_12px_35px_rgba(0,0,0,.38)] backdrop-blur-sm">
              <div className={`bg-gradient-to-r from-[#141414] via-[#2b2412] to-[#141414] border-b border-[#D4A017]/50 text-center ${posterDenso ? "py-1.5" : posterCompacto ? "py-2" : "py-3"}`}>
                <h3 className={`text-[#E7C36B] font-black tracking-[0.18em] ${posterDenso ? "text-xs" : "text-base"}`}>GRUPO {grupo.letra}</h3>
              </div>
              <div className={posterDenso ? "p-1.5" : posterCompacto ? "p-2" : "p-3"}>
                {grupo.equipos.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center italic py-4">Grupo Vacío</p>
                ) : (
                  grupo.equipos.map(equipo => (
                    <div key={equipo.id} className={`relative flex items-center min-w-0 border-b border-white/10 last:border-0 ${posterDenso ? "gap-1.5 px-1 py-1" : posterCompacto ? "gap-2 px-1.5 py-1.5" : "gap-3 p-2"}`}>
                      <div className="shrink-0 flex items-center justify-center" style={{ width: tamanoEscudo, height: tamanoEscudo }}>
                        {equipo.shield_url ? (
                          // crossOrigin="anonymous" es vital para que html2canvas pueda capturar imágenes de Supabase
                          <Image src={equipo.shield_url} alt={`Escudo de ${equipo.name}`} width={tamanoEscudo} height={tamanoEscudo} unoptimized crossOrigin="anonymous" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-[#2E2E2E] rounded-full flex items-center justify-center text-[9px]">🛡️</div>
                        )}
                      </div>
                      <span className={`min-w-0 flex-1 text-white font-black uppercase leading-tight break-words ${posterDenso ? "text-[8px]" : posterCompacto ? "text-[9px]" : "text-xs"}`}>{equipo.name}</span>
                      {/* En la foto no queremos que salga el botón de borrar, pero se mantiene interactivo aquí */}
                      <button data-html2canvas-ignore onClick={() => cambiarGrupoManual(equipo.id, "Libre")} className="absolute right-1 top-1 text-red-500 hover:text-red-400 text-[8px]">✖</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Marca de agua elegante al final de la imagen */}
        <div className="relative text-center mt-8 pt-4 border-t border-[#D4A017]/30">
          <p className="text-xs font-black text-[#E7C36B] uppercase tracking-[0.35em]">El camino al campeonato comienza aquí</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Generado por GAME LEGAL</p>
        </div>
      </div>

      {modoPresentacion && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#030712] p-6 text-white">
          <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#D4A017]/40 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4A017]">Modo presentaciÃ³n</p>
                <h2 className="text-4xl font-black uppercase tracking-widest">{nombreTorneo}</h2>
              </div>
              <button onClick={() => setModoPresentacion(false)} className="rounded-xl border border-white/20 px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-200 hover:bg-white hover:text-black">Cerrar</button>
            </div>
            <AudioExperienceControls compact label="Audio de sala" />
            <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-3xl border border-[#D4A017]/40 bg-gradient-to-b from-[#111827] to-black p-8 text-center">
                <div className={`mb-8 flex h-60 w-60 items-center justify-center rounded-full border-4 border-[#D4A017] bg-[radial-gradient(circle,#3b2d0b,#050505_65%)] shadow-[0_0_80px_rgba(212,160,23,.4)] ${sorteoEnVivo ? "animate-spin" : ""}`}>
                  <span className="text-5xl font-black text-[#E7C36B]">GÂ·L</span>
                </div>
                <button onClick={sorteoAutomatico} disabled={loading} className="w-full rounded-2xl bg-[#D4A017] px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-black hover:bg-yellow-400">
                  Iniciar sorteo
                </button>
                <div className="mt-8">
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4A017]">RevelaciÃ³n</p>
                  <h3 className="mt-3 text-3xl font-black uppercase tracking-widest">{equipoRevelado?.name || "En espera"}</h3>
                  <p className="mt-2 text-xl font-black text-gray-300">{grupoRevelado || "Sin grupo asignado"}</p>
                </div>
              </div>
              <div className="grid auto-rows-min gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(columnasPoster, 4)}, minmax(0, 1fr))` }}>
                {equiposPorGrupo.map(grupo => (
                  <div key={grupo.letra} className="rounded-3xl border border-[#D4A017]/45 bg-[#0B1220]/90 p-5 shadow-2xl">
                    <h3 className="mb-4 text-center text-xl font-black uppercase tracking-[0.25em] text-[#E7C36B]">Grupo {grupo.letra}</h3>
                    <div className="space-y-3">
                      {grupo.equipos.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">VacÃ­o</p> : grupo.equipos.map(equipo => (
                        <div key={equipo.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                          {equipo.shield_url ? <Image src={equipo.shield_url} alt={`Escudo de ${equipo.name}`} width={38} height={38} unoptimized className="h-10 w-10 object-contain" /> : <div className="h-10 w-10 rounded-full bg-white/10" />}
                          <span className="text-base font-black uppercase tracking-wide">{equipo.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
