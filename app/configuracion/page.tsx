"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface TournamentConfig {
  id?: string;
  name: string;
  registration_fee: number;
  prize_pool: number;
  formato: string;
  status: 'draft' | 'active' | 'finished';
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<TournamentConfig>({
    name: "Copa GAME-LEGAL 2026",
    registration_fee: 150,
    prize_pool: 2000,
    formato: "champions",
    status: "draft"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const formatos = [
    { id: "liguilla", nombre: "Liguilla Simple", icono: "📊", desc: "Todos contra todos. El equipo con mayor puntaje se corona campeón." },
    { id: "champions", nombre: "Estilo Champions League", icono: "🏆", desc: "Fase de grupos de 4 equipos. Los dos mejores clasifican a eliminación directa." },
    { id: "mundial", nombre: "Estilo Copa Mundial", icono: "🌍", desc: "Fase de grupos rápida, seguida de cuartos de final, semifinal y gran final." },
    { id: "sudamericana", nombre: "Eliminación Directa (Mata-Mata)", icono: "⚔️", desc: "Cruces directos de ida y vuelta desde la primera fase." }
  ];

  // Sincronización inicial con Supabase
  useEffect(() => {
    async function fetchTournament() {
      try {
        const { data, error } = await supabase
          .from("tournaments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        if (data) {
          setConfig({
            id: data.id,
            name: data.name,
            registration_fee: Number(data.registration_fee),
            prize_pool: Number(data.prize_pool),
            formato: data.primary_color === '#D4A017' ? 'champions' : 'liguilla', // Mapeo seguro
            status: data.status
          });
        }
      } catch (err: any) {
        console.error("Error cargando configuración:", err.message);
      }
    }
    fetchTournament();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const payload = {
        name: config.name,
        registration_fee: config.registration_fee,
        prize_pool: config.prize_pool,
        status: config.status
      };

      let error;
      if (config.id) {
        ({ error } = await supabase.from("tournaments").update(payload).eq("id", config.id));
      } else {
        ({ error } = await supabase.from("tournaments").insert([payload]));
      }

      if (error) throw error;
      setMessage({ text: "✓ Configuración guardada correctamente en Supabase.", type: "success" });
    } catch (err: any) {
      setMessage({ text: `🚫 Error al guardar: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-black text-gray-900">Configuración Avanzada del Torneo</h2>
        <p className="text-gray-500">Ajusta los parámetros financieros, de premiación y los formatos de competición oficiales.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl font-bold text-sm ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleGuardar} className="grid md:grid-cols-2 gap-6">
        {/* PANEL IZQUIERDO: SELECCIÓN DE SUGERENCIAS Y FORMATOS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">🕹️ Sugerencias de Formato</h3>
          <div className="space-y-3">
            {formatos.map(f => (
              <div 
                key={f.id} 
                onClick={() => setConfig({...config, formato: f.id})}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex gap-4 items-center ${config.formato === f.id ? 'border-[#D4A017] bg-[#D4A017]/5' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="text-3xl">{f.icono}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{f.nombre}</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: DATOS DEL CAMPEONATO Y PREMIACIÓN */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4 text-gray-800">💰 Estructura Financiera</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre del Campeonato</label>
                <input type="text" value={config.name} onChange={e=>setConfig({...config, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl mt-1 focus:border-[#D4A017] outline-none font-medium text-gray-800 bg-gray-50/50" required />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inscripción ($)</label>
                  <input type="number" value={config.registration_fee} onChange={e=>setConfig({...config, registration_fee: Number(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl mt-1 focus:border-[#D4A017] outline-none font-mono bg-gray-50/50" required />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Premio Mayor ($)</label>
                  <input type="number" value={config.prize_pool} onChange={e=>setConfig({...config, prize_pool: Number(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl mt-1 focus:border-[#D4A017] outline-none font-mono bg-gray-50/50" required />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#141414] to-[#1c1c1c] p-6 rounded-2xl shadow-lg border border-[#2E2E2E] text-white">
            <h3 className="font-bold text-lg mb-2 text-[#D4A017] tracking-wide">🚀 Inicialización Automática</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Al guardar los cambios, el sistema estructurará el campeonato basándose en el formato de <b>{formatos.find(f => f.id === config.formato)?.nombre}</b>. Se optimizarán los cruces impidiendo conflictos hororarios automáticamente.
            </p>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 bg-[#D4A017] text-black font-black text-xs rounded-xl hover:bg-yellow-500 transition-all uppercase tracking-widest shadow-[0_4px_20px_rgba(212,160,23,0.3)] disabled:opacity-50"
            >
              {loading ? "Sincronizando..." : "Guardar y Estructurar Fixture"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
