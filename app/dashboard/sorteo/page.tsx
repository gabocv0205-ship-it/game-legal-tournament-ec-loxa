"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SorteoPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [numGrupos, setNumGrupos] = useState<number>(4);
  const [loading, setLoading] = useState(false);

  // Letras para los grupos (A, B, C, D...)
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

  // 🎲 FUNCIÓN: Sorteo Automático (Aleatorio)
  const sorteoAutomatico = async () => {
    if (!window.confirm(`¿Sortear automáticamente a los ${equipos.length} equipos en ${numGrupos} grupos?`)) return;
    setLoading(true);

    // 1. Desordenar los equipos aleatoriamente (Algoritmo Fisher-Yates)
    let equiposMezclados = [...equipos];
    for (let i = equiposMezclados.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [equiposMezclados[i], equiposMezclados[j]] = [equiposMezclados[j], equiposMezclados[i]];
    }

    // 2. Asignar los grupos en orden circular (A, B, C, D, A, B, C, D...)
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

  // ✍️ FUNCIÓN: Asignación Manual
  const cambiarGrupoManual = async (equipoId: string, nuevoGrupo: string) => {
    try {
      await supabase.from("teams").update({ group_name: nuevoGrupo === "Libre" ? null : nuevoGrupo }).eq("id", equipoId);
      cargarEquipos();
    } catch (error) {
      alert("Error al asignar grupo.");
    }
  };

  // 🧹 FUNCIÓN: Limpiar Sorteo (Resetear)
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

  // Agrupar los equipos para mostrarlos en pantalla
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
            <label className="text-xs font-bold text-gray-500 uppercase">Grupos a crear:</label>
            <select value={numGrupos} onChange={e => setNumGrupos(Number(e.target.value))} className="bg-[#1C1C1C] text-[#D4A017] font-black border border-[#2E2E2E] rounded p-2 outline-none">
              {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} Grupos</option>)}
            </select>
          </div>
          <button onClick={sorteoAutomatico} disabled={loading} className="bg-[#D4A017] text-black font-black uppercase text-xs px-4 py-2 rounded shadow-[0_0_15px_rgba(212,160,23,0.3)] hover:bg-yellow-500 transition-all">
            {loading ? "Sorteando..." : "🎲 Sorteo Aleatorio"}
          </button>
          <button onClick={limpiarSorteo} disabled={loading} className="bg-red-900/30 text-red-500 border border-red-900 font-black uppercase text-xs px-4 py-2 rounded hover:bg-red-900 hover:text-white transition-all">
            Limpiar
          </button>
        </div>
      </div>

      {/* EQUIPOS SIN ASIGNAR (Para Sorteo Manual) */}
      {equiposLibres.length > 0 && (
        <div className="bg-gradient-to-r from-[#141414] to-[#1a1a1a] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
          <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm mb-4">Equipos en el Bombo (Sin Grupo)</h3>
          <div className="flex flex-wrap gap-3">
            {equiposLibres.map(equipo => (
              <div key={equipo.id} className="flex items-center bg-[#1c1c1c] border border-[#2E2E2E] rounded-lg p-2 pr-4 gap-3">
                {equipo.shield_url ? (
                  <img src={equipo.shield_url} alt="Escudo" className="w-6 h-6 object-contain rounded-full" />
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

      {/* VISTA DE LOS GRUPOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {equiposPorGrupo.map(grupo => (
          <div key={grupo.letra} className="bg-[#141414] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-xl">
            <div className="bg-[#1C1C1C] border-b border-[#2E2E2E] py-3 text-center">
              <h3 className="text-[#D4A017] font-black text-xl">GRUPO {grupo.letra}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase">{grupo.equipos.length} Equipos</p>
            </div>
            <div className="p-4 space-y-2">
              {grupo.equipos.length === 0 ? (
                <p className="text-gray-600 text-xs text-center italic py-4">Grupo Vacío</p>
              ) : (
                grupo.equipos.map(equipo => (
                  <div key={equipo.id} className="flex items-center justify-between bg-[#1C1C1C] border border-[#2E2E2E] p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      {equipo.shield_url ? (
                        <img src={equipo.shield_url} alt="Escudo" className="w-6 h-6 object-contain rounded-full bg-white/5" />
                      ) : (
                        <div className="w-6 h-6 bg-[#2E2E2E] rounded-full flex items-center justify-center text-[10px]">🛡️</div>
                      )}
                      <span className="text-white font-bold text-sm truncate w-24">{equipo.name}</span>
                    </div>
                    {/* Botón para removerlo del grupo si se equivocaron manual */}
                    <button onClick={() => cambiarGrupoManual(equipo.id, "Libre")} className="text-red-500 hover:text-red-400 text-xs">✖</button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
