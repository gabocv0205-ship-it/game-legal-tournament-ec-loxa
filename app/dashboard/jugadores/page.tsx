"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function JugadoresPage() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  const [teamId, setTeamId] = useState("");
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const loadData = async () => {
    const { data: tourney } = await supabase.from('tournaments').select('id').order('created_at', { ascending: false }).limit(1).single();
    if (tourney) {
      setTournamentId(tourney.id);
      
      // 1. Cargamos los equipos reales para el selector
      const { data: t } = await supabase.from('teams').select('id, name').eq('tournament_id', tourney.id);
      if (t) setEquipos(t);

      // 2. Cargamos los jugadores y usamos un "JOIN" para traer el escudo y nombre de su equipo
      const { data: j } = await supabase.from('players').select('*, teams(name, shield_url)').eq('tournament_id', tourney.id).order('created_at', { ascending: false });
      if (j) setJugadores(j);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId || !teamId) return setMensaje("🚫 Debes seleccionar un club válido.");
    setLoading(true);
    setMensaje("");

    const { error } = await supabase.from('players').insert([{
      tournament_id: tournamentId,
      team_id: teamId,
      full_name: nombre,
      cedula: cedula
    }]);

    if (error) {
      if (error.code === '23505') setMensaje(`🚫 ALERTA DE FRAUDE: La cédula ${cedula} ya pertenece a un jugador en este torneo.`);
      else setMensaje("🚫 Error al guardar: " + error.message);
    } else {
      setMensaje("✓ Jugador fichado correctamente.");
      setNombre("");
      setCedula("");
      loadData(); // Actualiza la tabla en vivo
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-black text-white">Plantillas Oficiales</h2>
        <p className="text-gray-400">Asigna jugadores reales a sus respectivos clubes con validación de identidad.</p>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-xl font-bold text-sm ${mensaje.includes('✓') ? 'bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/50' : 'bg-red-900/40 text-red-400 border border-red-500/50'}`}>
          {mensaje}
        </div>
      )}

      {/* FORMULARIO DE FICHAJE */}
      <div className="bg-[#141414] p-6 rounded-2xl shadow-lg border border-[#2E2E2E]">
        <form onSubmit={handleGuardar} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Club Destino</label>
            <select value={teamId} onChange={e=>setTeamId(e.target.value)} className="w-full p-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl mt-1 text-white outline-none focus:border-[#D4A017]" required>
              <option value="" className="text-gray-500">Seleccionar equipo de la base...</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Número Cédula</label>
            <input type="text" value={cedula} onChange={e=>setCedula(e.target.value)} className="w-full p-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl mt-1 text-white font-mono outline-none focus:border-[#D4A017]" required placeholder="Ej: 1100000000" />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombres Completos</label>
            <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full p-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl mt-1 text-white outline-none focus:border-[#D4A017]" required placeholder="Ej: Juan Fernando López" />
          </div>
          <button type="submit" disabled={loading} className="px-6 py-3 bg-[#D4A017] hover:bg-yellow-500 text-black font-black uppercase tracking-widest rounded-xl text-xs transition-all h-[48px] shadow-[0_0_15px_rgba(212,160,23,0.3)] disabled:opacity-50">
            {loading ? "..." : "+ Fichar"}
          </button>
        </form>
      </div>

      {/* TABLA DE JUGADORES (Conectada a la DB) */}
      <div className="bg-[#141414] rounded-2xl shadow-lg border border-[#2E2E2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-500 uppercase text-xs tracking-wider border-b border-[#2E2E2E]">
              <tr>
                <th className="p-4">Cédula Identidad</th>
                <th className="p-4">Nombre del Jugador</th>
                <th className="p-4">Club Asociado</th>
                <th className="p-4 text-center">Estado Legal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {jugadores.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Ningún jugador ha sido fichado aún.</td></tr>
              ) : (
                jugadores.map(j => (
                  <tr key={j.id} className="hover:bg-[#1C1C1C] transition-colors">
                    <td className="p-4 font-mono font-medium text-[#D4A017]">{j.cedula}</td>
                    <td className="p-4 font-bold text-white">{j.full_name}</td>
                    <td className="p-4 text-gray-300 flex items-center gap-3">
                      <span className="text-xl bg-[#1C1C1C] p-1 rounded-md border border-[#2E2E2E]">{j.teams?.shield_url || '⚽'}</span> 
                      {j.teams?.name}
                    </td>
                    <td className="p-4 text-center">
                      {j.suspended 
                        ? <span className="bg-red-900/40 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/50">Inhabilitado</span>
                        : <span className="bg-[#D4A017]/10 text-[#D4A017] text-xs font-bold px-3 py-1 rounded-full border border-[#D4A017]/30">Aprobado</span>}
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
