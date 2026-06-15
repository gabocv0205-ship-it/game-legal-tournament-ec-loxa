"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { QRCodeCanvas } from "qrcode.react";

export default function SorteoPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [numGrupos, setNumGrupos] = useState<number>(4);
  const [nombreTorneo, setNombreTorneo] = useState("Torneo Oficial");
  const [torneoSlug, setTorneoSlug] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [fondoPosterUrl, setFondoPosterUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  
  // Referencia para capturar la imagen
  const capturaRef = useRef<HTMLDivElement>(null);

  const letrasGrupos = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    cargarEquipos();
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, []);

  const cargarEquipos = async () => {
    const activeId = typeof window !== "undefined" ? localStorage.getItem("activeTournamentId") : null;
    if (!activeId) return setMensaje("Selecciona primero un torneo desde Mis Torneos.");
    setLoading(true);
    setMensaje("");
    const [tournamentResult, teamsResult] = await Promise.all([
      supabase.from("tournaments").select("id, name, slug, group_count, match_poster_background_url").eq("id", activeId).maybeSingle(),
      supabase.from("teams").select("id, name, shield_url, group_name, tournament_id").eq("tournament_id", activeId).order("name"),
    ]);
    if (tournamentResult.data) {
      setNombreTorneo(tournamentResult.data.name || "Torneo Oficial");
      setTorneoSlug(tournamentResult.data.slug || "");
      setNumGrupos(Math.max(2, Number(tournamentResult.data.group_count || 4)));
      setFondoPosterUrl(tournamentResult.data.match_poster_background_url || "");
    }
    if (teamsResult.error) {
      setEquipos([]);
      setMensaje(`No se pudieron cargar los equipos: ${teamsResult.error.message}`);
    } else {
      setEquipos(teamsResult.data || []);
      if (!teamsResult.data?.length) setMensaje("Este torneo todavía no tiene equipos registrados.");
    }
    setLoading(false);
  };

  const sorteoAutomatico = async () => {
    if (!window.confirm(`¿Sortear automáticamente a los ${equipos.length} equipos en ${numGrupos} grupos?`)) return;
    setLoading(true);

    let equiposMezclados = [...equipos];
    for (let i = equiposMezclados.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [equiposMezclados[i], equiposMezclados[j]] = [equiposMezclados[j], equiposMezclados[i]];
    }

    const actualizaciones = equiposMezclados.map((equipo, index) => {
      const grupoAsignado = letrasGrupos[index % numGrupos];
      return supabase.from("teams").update({ group_name: grupoAsignado }).eq("id", equipo.id);
    });

    try {
      const resultados = await Promise.all(actualizaciones);
      const error = resultados.find(resultado => resultado.error)?.error;
      if (error) throw error;
      await cargarEquipos();
    } catch (error: any) {
      alert(`Error al realizar el sorteo: ${error.message || "operación bloqueada"}`);
    } finally {
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
          <button onClick={limpiarSorteo} disabled={loading} className="bg-red-900/30 text-red-500 border border-red-900 font-black uppercase text-xs px-4 py-2 rounded hover:bg-red-900 hover:text-white transition-all">
            Limpiar
          </button>
          {/* NUEVO BOTÓN DE DESCARGA */}
          <button onClick={descargarImagen} disabled={loading || equiposPorGrupo.every(g => g.equipos.length === 0)} className="bg-blue-600 text-white font-black uppercase text-xs px-4 py-2 rounded shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all ml-auto">
            📸 Descargar para Redes
          </button>
        </div>
      </div>
      {mensaje && <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm font-bold text-amber-200">{mensaje}</div>}

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

    </div>
  );
}
