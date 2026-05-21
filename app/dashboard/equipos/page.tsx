"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [shield, setShield] = useState("⚽");
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const loadEquipos = async () => {
    const { data: tourney } = await supabase.from('tournaments').select('id').order('created_at', { ascending: false }).limit(1).single();
    if (tourney) {
      setTournamentId(tourney.id);
      const { data } = await supabase.from('teams').select('*').eq('tournament_id', tourney.id).order('created_at', { ascending: false });
      if (data) setEquipos(data);
    }
  };

  useEffect(() => { loadEquipos(); }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) return setMensaje("Error: No hay un torneo activo configurado.");
    setLoading(true);
    setMensaje("");

    const { error } = await supabase.from('teams').insert([{
      tournament_id: tournamentId,
      name: nombre,
      shield_url: shield
    }]);

    if (error) {
      if (error.code === '23505') setMensaje("🚫 Este nombre de equipo ya existe en el torneo.");
      else setMensaje("🚫 Error al guardar: " + error.message);
    } else {
      setMensaje("✓ Equipo registrado exitosamente.");
      setNombre("");
      setShield("⚽");
      loadEquipos(); // Recarga los datos reales al instante
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-3xl font-black text-white">Gestión de Clubes</h2>
        <p className="text-gray-400">Registra los equipos participantes. Sus escudos y nombres se sincronizarán en todo el torneo.</p>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-xl font-bold text-sm ${mensaje.includes('✓') ? 'bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/50' : 'bg-red-900/40 text-red-400 border border-red-500/50'}`}>
          {mensaje}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* FORMULARIO DE REGISTRO */}
        <div className="bg-[#141414] p-6 rounded-2xl shadow-lg border border-[#2E2E2E] h-fit">
          <h3 className="font-bold mb-4 text-white flex items-center gap-2">🛡️ Nuevo Club</h3>
          <form onSubmit={handleGuardar} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre del Equipo</label>
              <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full p-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl mt-1 text-white outline-none focus:border-[#D4A017] transition-all" required placeholder="Ej: Águilas de Loja" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Escudo (Emoji/Sigla)</label>
              <input type="text" value={shield} onChange={e=>setShield(e.target.value)} className="w-full p-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl mt-1 text-center text-2xl outline-none focus:border-[#D4A017] transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-[#D4A017] hover:bg-yellow-500 text-black font-black uppercase tracking-widest rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)] disabled:opacity-50">
              {loading ? "Sincronizando..." : "Inscribir Club"}
            </button>
          </form>
        </div>

        {/* LISTADO DE EQUIPOS REALES */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipos.map(eq => (
            <div key={eq.id} className="bg-[#141414] p-5 rounded-2xl shadow-sm border border-[#2E2E2E] flex items-center justify-between hover:border-[#D4A017] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#1C1C1C] border border-[#2E2E2E] rounded-full flex items-center justify-center text-3xl shadow-inner">
                  {eq.shield_url || "⚽"}
                </div>
                <div>
                  <h4 className="font-black text-white text-lg leading-tight">{eq.name}</h4>
                  <p className="text-xs text-[#D4A017] font-bold mt-1">Conectado a DB</p>
                </div>
              </div>
            </div>
          ))}
          {equipos.length === 0 && (
            <div className="col-span-2 text-center py-12 border border-[#2E2E2E] border-dashed rounded-2xl text-gray-500 font-medium">
              Aún no hay equipos reales en la base de datos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
