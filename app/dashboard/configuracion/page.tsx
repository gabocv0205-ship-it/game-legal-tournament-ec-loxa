"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ConfiguracionPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState("todos_contra_todos");
  const [premio1, setPremio1] = useState("");
  const [premio2, setPremio2] = useState("");
  const [premio3, setPremio3] = useState("");
  const [reglamento, setReglamento] = useState<File | null>(null);
  const [reglamentoUrl, setReglamentoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    const { data } = await supabase.from('tournaments').select('*').limit(1).single();
    if (data) {
      setTorneoId(data.id);
      setNombre(data.name || "");
      setFormato(data.format || "todos_contra_todos");
      setPremio1(data.prize_first || "");
      setPremio2(data.prize_second || "");
      setPremio3(data.prize_third || "");
      setReglamentoUrl(data.rules_url || "");
    }
  };

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torneoId) return alert("No hay un torneo activo creado en el sistema.");
    setLoading(true);

    try {
      let nuevaUrlReglamento = reglamentoUrl;

      // Si el cliente seleccionó un nuevo PDF
      if (reglamento) {
        const fileExt = reglamento.name.split('.').pop();
        const fileName = `reglamento-${Date.now()}.${fileExt}`;

        // Subir a Storage
        const { error: uploadError } = await supabase.storage
          .from("reglamentos")
          .upload(fileName, reglamento, { upsert: true });

        if (uploadError) throw uploadError;

        // Obtener Link Público
        const { data: publicUrlData } = supabase.storage.from("reglamentos").getPublicUrl(fileName);
        nuevaUrlReglamento = publicUrlData.publicUrl;
      }

      // Actualizar Base de Datos
      const { error } = await supabase.from("tournaments").update({
        name: nombre,
        format: formato,
        prize_first: premio1,
        prize_second: premio2,
        prize_third: premio3,
        rules_url: nuevaUrlReglamento
      }).eq("id", torneoId);

      if (error) throw error;

      alert("¡Configuración guardada con éxito!");
      cargarConfiguracion(); // Recargar datos frescos
      setReglamento(null); // Limpiar el input de archivo

    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-black text-white uppercase tracking-wider">Configuración del Torneo</h2>
      <p className="text-gray-400 text-sm">Define el formato de competición, establece los premios y sube el reglamento oficial para mantener la transparencia.</p>

      <form onSubmit={guardarConfiguracion} className="space-y-8 bg-[#141414] p-8 rounded-2xl border border-[#2E2E2E] shadow-2xl">
        
        {/* SECCIÓN 1: DATOS GENERALES */}
        <div className="space-y-4">
          <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2 flex items-center gap-2">
            <i className="fa fa-trophy"></i> Datos Principales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre del Torneo</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-[#D4A017] outline-none transition-all" placeholder="Ej: Champions League Loja" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Formato de Competición</label>
              <select value={formato} onChange={e => setFormato(e.target.value)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-[#D4A017] outline-none transition-all cursor-pointer">
                <option value="todos_contra_todos">Liga (Todos contra Todos)</option>
                <option value="grupos_eliminatoria">Fase de Grupos + Eliminatorias (Estilo Mundial)</option>
                <option value="eliminatoria_ida_vuelta">Eliminatoria Ida y Vuelta (Estilo Libertadores)</option>
                <option value="eliminatoria_directa">Eliminatoria Directa a un partido</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PREMIOS */}
        <div className="space-y-4">
          <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2 flex items-center gap-2">
            <i className="fa fa-medal"></i> Tabla de Premios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="text-yellow-400">🥇</span> Campeón</label>
              <input type="text" value={premio1} onChange={e => setPremio1(e.target.value)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-[#D4A017] outline-none transition-all" placeholder="Ej: Trofeo + $1000" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="text-gray-400">🥈</span> Subcampeón</label>
              <input type="text" value={premio2} onChange={e => setPremio2(e.target.value)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-[#D4A017] outline-none transition-all" placeholder="Ej: Medallas + $500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="text-amber-600">🥉</span> Tercer Lugar</label>
              <input type="text" value={premio3} onChange={e => setPremio3(e.target.value)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-[#D4A017] outline-none transition-all" placeholder="Ej: Medallas + Inscripción Gratis" />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: REGLAMENTO OFICIAL */}
        <div className="space-y-4">
          <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2 flex items-center gap-2">
            <i className="fa fa-gavel"></i> Documento Reglamentario
          </h3>
          <div className="bg-[#1c1c1c] p-6 rounded-xl border border-[#2e2e2e] flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Subir Reglamento (Formato PDF)</label>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={e => setReglamento(e.target.files?.[0] || null)} 
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20 transition-all cursor-pointer" 
              />
              <p className="text-[10px] text-gray-500 mt-2">* Este documento será público y visible para todos los equipos.</p>
            </div>
            
            {reglamentoUrl && (
              <div className="md:border-l border-[#2E2E2E] md:pl-6 text-center w-full md:w-auto">
                <p className="text-xs font-bold text-green-500 uppercase mb-2">Reglamento Activo</p>
                <a href={reglamentoUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-[#2E2E2E] hover:bg-[#D4A017] hover:text-black text-white transition-all font-bold text-xs py-2 px-6 rounded-lg shadow-lg">
                  Ver PDF Actual
                </a>
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN GUARDAR */}
        <div className="pt-4 border-t border-[#2E2E2E]">
          <button type="submit" disabled={loading} className="w-full py-4 bg-[#D4A017] text-black font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(212,160,23,0.3)] text-lg">
            {loading ? "Guardando Cambios..." : "Guardar Configuración Oficial"}
          </button>
        </div>

      </form>
    </div>
  );
}
