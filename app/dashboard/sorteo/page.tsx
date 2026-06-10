"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";

export default function SorteoPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [numGrupos, setNumGrupos] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  
  // Referencia para capturar la imagen
  const capturaRef = useRef<HTMLDivElement>(null);

  const letrasGrupos = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    cargarEquipos();
  }, []);

  const cargarEquipos = async () => {
    const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
    if (!tourney) return;

    const { data } = await supabase.from("teams").select("*").eq("tournament_id", tourney.id).order("name");
    if (data) setEquipos(data);
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
      await Promise.all(actualizaciones);
      cargarEquipos();
    } catch (error) {
      alert("Error al realizar el sorteo.");
    } finally {
      setLoading(false);
    }
  };

  const cambiarGrupoManual = async (equipoId: string, nuevoGrupo: string) => {
    try {
      await supabase.from("teams").update({ group_name: nuevoGrupo === "Libre" ? null : nuevoGrupo }).eq("id", equipoId);
      cargarEquipos();
    } catch (error) {
      alert("Error al asignar grupo.");
    }
  };

  const limpiarSorteo = async () => {
    if (!window.confirm("¿Seguro que deseas vaciar todos los grupos?")) return;
    setLoading(true);
    const actualizaciones = equipos.map(equipo => supabase.from("teams").update({ group_name: null }).eq("id", equipo.id));
    try {
      await Promise.all(actualizaciones);
      cargarEquipos();
    } catch (error) {
      alert("Error al limpiar.");
    } finally {
      setLoading(false);
    }
  };

  // 📸 FUNCIÓN: Exportar a Imagen para Redes
  const descargarImagen = async () => {
    if (!capturaRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(capturaRef.current, {
        backgroundColor: "#0a0a0a", // Fondo oscuro para mantener la estética
        scale: 2, // Alta calidad para Instagram/Facebook
        useCORS: true // Permite cargar los escudos desde Supabase en la imagen
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Sorteo-Oficial-${Date.now()}.png`;
      link.click();
    } catch (error) {
      alert("Error al generar la imagen. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const equiposPorGrupo = letrasGrupos.slice(0, numGrupos).map(letra => ({
    letra,
    equipos: equipos.filter(e => e.group_name === letra)
  }));
  const equiposLibres = equipos.filter(e => !e.group_name);

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
      <div ref={capturaRef} className="p-4 bg-[#0a0a0a] rounded-xl">
        {/* Título solo visible en la imagen o al descargar */}
        <div className="text-center mb-6 border-b border-[#2E2E2E] pb-4">
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">Sorteo Oficial</h1>
          <p className="text-[#D4A017] font-bold text-sm tracking-widest uppercase mt-1">Fase de Grupos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {equiposPorGrupo.map(grupo => (
            <div key={grupo.letra} className="bg-[#141414] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-xl">
              <div className="bg-[#1C1C1C] border-b border-[#2E2E2E] py-3 text-center">
                <h3 className="text-[#D4A017] font-black text-xl">GRUPO {grupo.letra}</h3>
              </div>
              <div className="p-4 space-y-2">
                {grupo.equipos.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center italic py-4">Grupo Vacío</p>
                ) : (
                  grupo.equipos.map(equipo => (
                    <div key={equipo.id} className="flex items-center justify-between bg-[#1C1C1C] border border-[#2E2E2E] p-2 rounded-lg">
                      <div className="flex items-center gap-3">
                        {equipo.shield_url ? (
                          // crossOrigin="anonymous" es vital para que html2canvas pueda capturar imágenes de Supabase
                          <Image src={equipo.shield_url} alt={`Escudo de ${equipo.name}`} width={24} height={24} unoptimized crossOrigin="anonymous" className="w-6 h-6 object-contain rounded-full bg-white/5" />
                        ) : (
                          <div className="w-6 h-6 bg-[#2E2E2E] rounded-full flex items-center justify-center text-[10px]">🛡️</div>
                        )}
                        <span className="text-white font-bold text-sm truncate w-24">{equipo.name}</span>
                      </div>
                      {/* En la foto no queremos que salga el botón de borrar, pero se mantiene interactivo aquí */}
                      <button data-html2canvas-ignore onClick={() => cambiarGrupoManual(equipo.id, "Libre")} className="text-red-500 hover:text-red-400 text-xs">✖</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Marca de agua elegante al final de la imagen */}
        <div className="text-center mt-8 pt-4 border-t border-[#2E2E2E]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generado por GAME-LEGAL</p>
        </div>
      </div>

    </div>
  );
}
