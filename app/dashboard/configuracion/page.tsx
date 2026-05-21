"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ConfiguracionPage() {
  const [nombre, setNombre] = useState("");
  const [costo, setCosto] = useState("150");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function fetchTorneo() {
      const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(1).single();
      if (data) {
        setNombre(data.name);
        setCosto(data.registration_fee?.toString() || "150");
      }
    }
    fetchTorneo();
  }, []);

  const guardarTorneo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje("");

    const { error } = await supabase.from('tournaments').insert([{
      name: nombre,
      registration_fee: Number(costo)
    }]);

    if (error) {
      setMensaje("🚫 Error: " + error.message);
    } else {
      setMensaje("✓ Torneo guardado en la base de datos. Ya puedes registrar equipos.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-black text-white">Configurar Torneo Oficial</h2>
        <p className="text-gray-400">Crea el torneo base. Este paso es obligatorio para habilitar las demás funciones.</p>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-xl font-bold text-sm ${mensaje.includes('✓') ? 'bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/50' : 'bg-red-900/40 text-red-400 border border-red-500/50'}`}>
          {mensaje}
        </div>
      )}

      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        <form onSubmit={guardarTorneo} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre del Campeonato</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl mt-1 text-white outline-none focus:border-[#D4A017]" placeholder="Ej: Copa GAME-LEGAL 2026" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Costo de Inscripción ($)</label>
            <input type="number" value={costo} onChange={e => setCosto(e.target.value)} required className="w-full p-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl mt-1 text-white outline-none focus:border-[#D4A017]" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#D4A017] text-black font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)]">
            {loading ? "Conectando con Supabase..." : "Guardar Torneo"}
          </button>
        </form>
      </div>
    </div>
  );
}
