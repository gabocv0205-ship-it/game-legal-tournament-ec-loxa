"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ConfiguracionPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  
  // Datos Generales
  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState("todos_contra_todos");
  const [premio1, setPremio1] = useState("");
  const [premio2, setPremio2] = useState("");
  const [premio3, setPremio3] = useState("");
  const [reglamento, setReglamento] = useState<File | null>(null);
  const [reglamentoUrl, setReglamentoUrl] = useState("");
  
  // Motor Financiero (Nuevos campos)
  const [costoInscripcion, setCostoInscripcion] = useState("150.00");
  const [costoArbitraje, setCostoArbitraje] = useState("20.00");
  const [costoAmarilla, setCostoAmarilla] = useState("2.00");
  const [costoRoja, setCostoRoja] = useState("5.00");
  const [amarillasSuspension, setAmarillasSuspension] = useState(3);
  const [partidosSuspensionAmarillas, setPartidosSuspensionAmarillas] = useState(1);
  const [partidosSuspensionRoja, setPartidosSuspensionRoja] = useState(1);
  const [numGrupos, setNumGrupos] = useState(1);
  const [equiposPorGrupo, setEquiposPorGrupo] = useState(4);
  const [clasificadosPorGrupo, setClasificadosPorGrupo] = useState(2);
  const [repechaje, setRepechaje] = useState(false);
  const [cuposRepechaje, setCuposRepechaje] = useState(0);
  const [partidosEliminatoria, setPartidosEliminatoria] = useState(1);
  const [partidosFinal, setPartidosFinal] = useState(1);
  const [numCanchas, setNumCanchas] = useState(1);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("18:00");
  const [duracionPartido, setDuracionPartido] = useState(60);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    // Leemos el torneo que el cliente seleccionó en el Hub
    let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;

    if (!activeId) {
      const { data: fallback } = await supabase.from('tournaments').select('id').limit(1).single();
      if (fallback) activeId = fallback.id;
    }

    if (activeId) {
      const { data } = await supabase.from('tournaments').select('*').eq('id', activeId).single();
      if (data) {
        setTorneoId(data.id);
        setNombre(data.name || "");
        setFormato(data.format || "todos_contra_todos");
        setPremio1(data.prize_first || "");
        setPremio2(data.prize_second || "");
        setPremio3(data.prize_third || "");
        setReglamentoUrl(data.rules_url || "");
        
        // Cargar valores financieros (si existen, o dejar los por defecto)
        if (data.registration_fee) setCostoInscripcion(data.registration_fee.toString());
        if (data.referee_fee) setCostoArbitraje(data.referee_fee.toString());
        if (data.yellow_card_fee) setCostoAmarilla(data.yellow_card_fee.toString());
        if (data.red_card_fee) setCostoRoja(data.red_card_fee.toString());
        setAmarillasSuspension(Number(data.yellow_cards_for_suspension || 3));
        setPartidosSuspensionAmarillas(Number(data.yellow_suspension_matches || 1));
        setPartidosSuspensionRoja(Number(data.red_suspension_matches || 1));
        setNumGrupos(Number(data.group_count || 1));
        setEquiposPorGrupo(Number(data.teams_per_group || 4));
        setClasificadosPorGrupo(Number(data.qualifiers_per_group || 2));
        setRepechaje(Boolean(data.repechage_enabled));
        setCuposRepechaje(Number(data.repechage_slots || 0));
        setPartidosEliminatoria(Number(data.knockout_legs || 1));
        setPartidosFinal(Number(data.final_legs || 1));
        setNumCanchas(Number(data.court_count || 1));
        setHoraInicio((data.operating_start_time || "09:00").slice(0, 5));
        setHoraFin((data.operating_end_time || "18:00").slice(0, 5));
        setDuracionPartido(Number(data.match_duration_minutes || 60));
      }
    }
  };

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torneoId) return alert("No hay un torneo activo seleccionado.");
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

      // Actualizar Base de Datos (incluyendo los rubros financieros)
      const { error } = await supabase.from("tournaments").update({
        name: nombre,
        format: formato,
        prize_first: premio1,
        prize_second: premio2,
        prize_third: premio3,
        rules_url: nuevaUrlReglamento,
        registration_fee: parseFloat(costoInscripcion) || 0,
        referee_fee: parseFloat(costoArbitraje) || 0,
        yellow_card_fee: parseFloat(costoAmarilla) || 0,
        red_card_fee: parseFloat(costoRoja) || 0,
        yellow_cards_for_suspension: amarillasSuspension,
        yellow_suspension_matches: partidosSuspensionAmarillas,
        red_suspension_matches: partidosSuspensionRoja,
        group_count: numGrupos,
        teams_per_group: equiposPorGrupo,
        qualifiers_per_group: clasificadosPorGrupo,
        repechage_enabled: repechaje,
        repechage_slots: repechaje ? cuposRepechaje : 0,
        knockout_legs: partidosEliminatoria,
        final_legs: partidosFinal,
        court_count: numCanchas,
        operating_start_time: horaInicio,
        operating_end_time: horaFin,
        match_duration_minutes: duracionPartido,
        configuration_completed: true
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
      <p className="text-gray-400 text-sm">Define el formato, premios, valores financieros y reglamento oficial.</p>

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
                <option value="mundial">Copa Mundial</option>
                <option value="libertadores">Copa Libertadores</option>
                <option value="sudamericana">Copa Sudamericana</option>
                <option value="champions">UEFA Champions League</option>
                <option value="europa_league">UEFA Europa League</option>
                <option value="liguilla">Liguilla / Todos contra Todos</option>
                <option value="eliminatoria_directa">Eliminación Directa</option>
                <option value="personalizado">Formato Personalizado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-blue-400 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Reglas de Competición y Clasificación</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumberField label="Número de grupos" value={numGrupos} onChange={setNumGrupos} />
            <NumberField label="Equipos por grupo" value={equiposPorGrupo} onChange={setEquiposPorGrupo} />
            <NumberField label="Clasificados por grupo" value={clasificadosPorGrupo} onChange={setClasificadosPorGrupo} />
            <NumberField label="Cupos de repechaje" value={cuposRepechaje} onChange={setCuposRepechaje} min={0} disabled={!repechaje} />
          </div>
          <label className="flex items-center gap-3 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl p-4 cursor-pointer">
            <input type="checkbox" checked={repechaje} onChange={e => setRepechaje(e.target.checked)} className="w-5 h-5 accent-[#D4A017]" />
            <span className="text-white font-bold text-sm">Habilitar zona de repechaje</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Fases eliminatorias" value={partidosEliminatoria} onChange={setPartidosEliminatoria} />
            <SelectField label="Final" value={partidosFinal} onChange={setPartidosFinal} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-purple-400 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Programación Automática</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumberField label="Canchas disponibles" value={numCanchas} onChange={setNumCanchas} />
            <NumberField label="Duración por partido (min)" value={duracionPartido} onChange={setDuracionPartido} min={15} />
            <TimeField label="Hora de inicio" value={horaInicio} onChange={setHoraInicio} />
            <TimeField label="Hora de cierre" value={horaFin} onChange={setHoraFin} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-red-400 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Reglas Disciplinarias Automáticas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField label="Amarillas para suspensión" value={amarillasSuspension} onChange={setAmarillasSuspension} />
            <NumberField label="Partidos por acumulación" value={partidosSuspensionAmarillas} onChange={setPartidosSuspensionAmarillas} />
            <NumberField label="Partidos por roja" value={partidosSuspensionRoja} onChange={setPartidosSuspensionRoja} />
          </div>
        </div>

        {/* SECCIÓN 2: MOTOR FINANCIERO (NUEVO) */}
        <div className="space-y-4">
          <h3 className="text-green-500 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2 flex items-center gap-2">
            <i className="fa fa-coins"></i> Configuración Financiera (Libro Mayor)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><span className="text-green-500">$</span> Inscripción</label>
              <input type="number" step="0.01" value={costoInscripcion} onChange={e => setCostoInscripcion(e.target.value)} required className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-green-500 outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><span className="text-green-500">$</span> Arbitraje (Por Partido)</label>
              <input type="number" step="0.01" value={costoArbitraje} onChange={e => setCostoArbitraje(e.target.value)} required className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-green-500 outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><span className="text-yellow-500">🟨</span> Multa Amarilla</label>
              <input type="number" step="0.01" value={costoAmarilla} onChange={e => setCostoAmarilla(e.target.value)} required className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-yellow-500 outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><span className="text-red-500">🟥</span> Multa Roja</label>
              <input type="number" step="0.01" value={costoRoja} onChange={e => setCostoRoja(e.target.value)} required className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-red-500 outline-none transition-all font-mono" />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: PREMIOS */}
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

        {/* SECCIÓN 4: REGLAMENTO OFICIAL */}
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
          <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.01] transition-transform shadow-[0_0_20px_rgba(212,160,23,0.3)] text-lg">
            {loading ? "Actualizando Base de Datos..." : "Guardar Configuración Oficial"}
          </button>
        </div>

      </form>
    </div>
  );
}

function NumberField({ label, value, onChange, min = 1, disabled = false }: any) {
  return <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label><input type="number" min={min} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#1c1c1c] disabled:opacity-40 text-white border border-[#2e2e2e] rounded-xl focus:border-[#D4A017] outline-none" /></div>;
}

function SelectField({ label, value, onChange }: any) {
  return <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label><select value={value} onChange={e => onChange(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl"><option value={1}>Partido único</option><option value={2}>Ida y vuelta</option></select></div>;
}

function TimeField({ label, value, onChange }: any) {
  return <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label><input type="time" value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl" style={{ colorScheme: "dark" }} /></div>;
}
