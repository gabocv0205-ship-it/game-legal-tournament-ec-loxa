"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function JugadoresPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [plantillaAutomatica, setPlantillaAutomatica] = useState(false);
  const [maxJugadoresEquipo, setMaxJugadoresEquipo] = useState(25);
  
  // Formulario alineado con la base de datos (full_name y cedula)
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // Estados para Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [cedulaEditada, setCedulaEditada] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargandoDatos(true);
    try {
      // 1. AISLAMIENTO SAAS: Identificar el torneo activo
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      
      if (!activeId) {
        setCargandoDatos(false);
        return;
      }
      
      setTorneoId(activeId);

      const { data: tournamentData } = await supabase.from("tournaments")
        .select("is_auto_template_enabled, max_players_per_team")
        .eq("id", activeId)
        .single();
      setPlantillaAutomatica(Boolean(tournamentData?.is_auto_template_enabled));
      setMaxJugadoresEquipo(Number(tournamentData?.max_players_per_team || 25));

      // 2. Traer SOLO los equipos de este torneo
      const { data: teamsData } = await supabase.from("teams")
        .select("id, name")
        .eq("tournament_id", activeId)
        .order("name");
      if (teamsData) setEquipos(teamsData);

      // 3. Traer SOLO los jugadores de este torneo
      const { data: playersData } = await supabase.from("players")
        .select("*, teams(name)")
        .eq("tournament_id", activeId)
        .order("created_at", { ascending: false });
      if (playersData) setJugadores(playersData);

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
      // Inserción vinculada estrictamente al torneo activo
      const nombreLimpio = nombre.trim();
      const cedulaLimpia = cedula.trim();
      if (!nombreLimpio || !cedulaLimpia) throw new Error("La cédula y el nombre completo son obligatorios.");
      const { error } = await supabase.rpc("register_tournament_player", {
        p_tournament_id: torneoId,
        p_team_id: equipoId,
        p_full_name: nombreLimpio,
        p_cedula: cedulaLimpia,
      });
      
      // Manejo del candado de cédulas duplicadas (Solo dentro del mismo torneo)
      if (error) {
        if (error.message.includes("unique") || error.message.includes("cedula")) {
          throw new Error("Esta cédula ya está registrada en el torneo actual.");
        }
        throw error;
      }

      setNombre("");
      setCedula("");
      cargarDatos();
      alert("Jugador registrado con éxito.");
    } catch (error: any) { 
      alert("Aviso: " + error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const eliminarJugador = async (id: string) => {
    if (!window.confirm("¿Eliminar a este jugador del torneo?")) return;
    try {
      const { error } = await supabase.rpc("delete_tournament_player", { p_player_id: id });
      if (error) throw error;
      cargarDatos();
    } catch (error: any) { alert("Error al eliminar: " + error.message); }
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
          throw new Error("Esta cédula ya pertenece a otro jugador en este torneo.");
        }
        throw error;
      }

      setEditandoId(null);
      cargarDatos();
    } catch (error: any) { alert("Aviso: " + error.message); }
  };

  if (cargandoDatos) {
    return <div className="text-[#D4A017] text-center p-20 font-black animate-pulse">Sincronizando plantilla de jugadores...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white uppercase tracking-wider">Gestión de Jugadores</h2>
      <p className="text-gray-400 text-sm">Administra la nómina oficial del torneo seleccionado.</p>
      <div className={`rounded-xl border p-4 text-sm ${plantillaAutomatica ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-200" : "bg-[#141414] border-[#2E2E2E] text-gray-400"}`}>
        <strong className="uppercase text-xs tracking-widest">{plantillaAutomatica ? "Control estricto activo" : "Plantilla oficial opcional"}</strong>
        <p className="mt-1">{plantillaAutomatica ? `Cada equipo admite máximo ${maxJugadoresEquipo} jugadores oficiales. Una cédula no puede pertenecer a dos equipos del torneo.` : "Puedes registrar jugadores oficiales sin límite configurado. Las planillas abiertas por partido permanecen disponibles."}</p>
      </div>

      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        <form onSubmit={guardarJugador} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cédula / Pasaporte</label>
            <input type="text" value={cedula} onChange={e => setCedula(e.target.value)} required className="w-full p-3 mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="Ej: 1101234567" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="Ej: Lionel Messi" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Asignar a Club</label>
            <select value={equipoId} onChange={e => setEquipoId(e.target.value)} required className="w-full p-3 mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017] cursor-pointer">
              <option value="" disabled>Selecciona un equipo...</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name} ({jugadores.filter(jugador => jugador.team_id === eq.id).length}{plantillaAutomatica ? `/${maxJugadoresEquipo}` : ""})</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full md:col-span-3 py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)]">
            {loading ? "Guardando..." : "Registrar Jugador Oficial"}
          </button>
        </form>
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-400 text-[10px] tracking-widest uppercase font-bold border-b border-[#2E2E2E]">
              <tr>
                <th className="p-4">Cédula</th>
                <th className="p-4">Jugador</th>
                <th className="p-4">Club</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {jugadores.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-bold italic">No hay jugadores registrados en este torneo.</td></tr>
              ) : (
                jugadores.map(jugador => (
                  <tr key={jugador.id} className="hover:bg-[#141414] transition-all">
                    <td className="p-4 text-gray-300 font-mono">
                      {editandoId === jugador.id ? (
                        <input type="text" value={cedulaEditada} onChange={e => setCedulaEditada(e.target.value)} className="w-full p-2 text-sm rounded bg-[#0a0a0a] border border-[#D4A017] text-white outline-none" />
                      ) : (
                        jugador.cedula
                      )}
                    </td>
                    <td className="p-4">
                      {editandoId === jugador.id ? (
                        <input type="text" value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} className="w-full p-2 text-sm rounded bg-[#0a0a0a] border border-[#D4A017] text-white outline-none" />
                      ) : (
                        <span className="font-bold text-white uppercase">{jugador.full_name}</span>
                      )}
                    </td>
                    <td className="p-4 text-[#D4A017] font-bold uppercase">{jugador.teams?.name || "Sin Club"}</td>
                    <td className="p-4 text-right space-x-3">
                      {editandoId === jugador.id ? (
                        <>
                          <button onClick={() => guardarEdicion(jugador.id)} className="text-green-500 font-black uppercase text-[10px] tracking-wider hover:text-green-400">Guardar</button>
                          <button onClick={() => setEditandoId(null)} className="text-gray-500 font-black uppercase text-[10px] tracking-wider hover:text-gray-400">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { 
                            setEditandoId(jugador.id); 
                            setNombreEditado(jugador.full_name); 
                            setCedulaEditada(jugador.cedula); 
                          }} className="text-[#D4A017] font-black uppercase text-[10px] tracking-wider hover:text-yellow-300">Editar</button>
                          <button onClick={() => eliminarJugador(jugador.id)} className="text-red-500 font-black uppercase text-[10px] tracking-wider hover:text-red-400">Eliminar</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
