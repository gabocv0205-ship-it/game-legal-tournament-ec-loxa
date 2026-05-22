"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function JugadoresPage() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  
  // Formulario
  const [nombre, setNombre] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    // Cargar Equipos para el selector
    const { data: teamsData } = await supabase.from("teams").select("id, name").order("name");
    if (teamsData) setEquipos(teamsData);

    // Cargar Jugadores con el nombre de su equipo
    const { data: playersData } = await supabase.from("players").select("*, teams(name)").order("created_at", { ascending: false });
    if (playersData) setJugadores(playersData);
  };

  const guardarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      if (!tourney) throw new Error("Debes configurar un torneo primero.");

      const { error } = await supabase.from("players").insert([{ 
        name: nombre, 
        team_id: equipoId,
        tournament_id: tourney.id
      }]);
      if (error) throw error;

      setNombre("");
      cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  // --- FUNCIONES ELIMINAR Y EDITAR ---
  const eliminarJugador = async (id: string) => {
    if (!window.confirm("¿Eliminar a este jugador del torneo?")) return;
    try {
      await supabase.from("players").delete().eq("id", id);
      cargarDatos();
    } catch (error) { alert("Error al eliminar."); }
  };

  const guardarEdicion = async (id: string) => {
    try {
      await supabase.from("players").update({ name: nombreEditado }).eq("id", id);
      setEditandoId(null);
      cargarDatos();
    } catch (error) { alert("Error al actualizar."); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white">Gestión de Jugadores</h2>

      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        <form onSubmit={guardarJugador} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 mt-1" placeholder="Ej: Lionel Messi" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Asignar a Club</label>
            <select value={equipoId} onChange={e => setEquipoId(e.target.value)} required className="w-full p-3 mt-1">
              <option value="" disabled>Selecciona un equipo...</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full md:col-span-2 py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)]">
            {loading ? "Guardando..." : "Registrar Jugador"}
          </button>
        </form>
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#141414] text-gray-400 text-xs uppercase font-bold border-b border-[#2E2E2E]">
            <tr>
              <th className="p-4">Jugador</th>
              <th className="p-4">Club</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2E2E2E]">
            {jugadores.map(jugador => (
              <tr key={jugador.id} className="hover:bg-[#242424] transition-all">
                <td className="p-4">
                  {editandoId === jugador.id ? (
                    <input type="text" value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} className="w-full p-2 text-sm rounded bg-[#0a0a0a] border border-[#D4A017] text-white" autoFocus />
                  ) : (
                    <span className="font-bold text-white">{jugador.name}</span>
                  )}
                </td>
                <td className="p-4 text-gray-400">{jugador.teams?.name || "Sin Club"}</td>
                <td className="p-4 text-right space-x-3">
                  {editandoId === jugador.id ? (
                    <>
                      <button onClick={() => guardarEdicion(jugador.id)} className="text-green-500 font-bold hover:text-green-400">Guardar</button>
                      <button onClick={() => setEditandoId(null)} className="text-gray-500 font-bold hover:text-gray-400">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditandoId(jugador.id); setNombreEditado(jugador.name); }} className="text-[#D4A017] font-bold hover:text-yellow-300">Editar</button>
                      <button onClick={() => eliminarJugador(jugador.id)} className="text-red-500 font-bold hover:text-red-400">Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jugadores.length === 0 && <div className="p-8 text-center text-gray-500 font-bold">No hay jugadores registrados.</div>}
      </div>
    </div>
  );
}
