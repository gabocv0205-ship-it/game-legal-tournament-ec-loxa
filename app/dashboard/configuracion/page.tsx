"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";

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
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [duracionPartido, setDuracionPartido] = useState(60);
  const [descansoPartidos, setDescansoPartidos] = useState(10);
  const [modalidadFutbol, setModalidadFutbol] = useState(11);
  const [numSuplentes, setNumSuplentes] = useState(5);
  const [canchaFinal, setCanchaFinal] = useState("");
  const [anioTorneo, setAnioTorneo] = useState(new Date().getFullYear());
  const [plantillaAutomatica, setPlantillaAutomatica] = useState(false);
  const [maxJugadoresEquipo, setMaxJugadoresEquipo] = useState(25);
  const [bannerUrl, setBannerUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [fondoPartidosUrl, setFondoPartidosUrl] = useState("");
  const [auspiciantes, setAuspiciantes] = useState("");
  const [bannerArchivo, setBannerArchivo] = useState<File | null>(null);
  const [posterArchivo, setPosterArchivo] = useState<File | null>(null);
  const [fondoPartidosArchivo, setFondoPartidosArchivo] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    // Leemos el torneo que el cliente seleccionó en el Hub
    let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;

    if (activeId) {
      const data = await getAccessibleTournament(supabase, activeId);
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
        setFechaInicio(data.start_date || "");
        setFechaFin(data.estimated_end_date || "");
        setDuracionPartido(Number(data.match_duration_minutes || 60));
        setDescansoPartidos(Number(data.break_between_matches_minutes || 10));
        setModalidadFutbol(Number(data.football_modality || 11));
        setNumSuplentes(Number(data.substitutes_count ?? 5));
        setCanchaFinal(data.final_venue || "");
        setAnioTorneo(Number(data.tournament_year || new Date().getFullYear()));
        setPlantillaAutomatica(Boolean(data.is_auto_template_enabled));
        setMaxJugadoresEquipo(Number(data.max_players_per_team || 25));
        setBannerUrl(data.banner_url || "");
        setPosterUrl(data.poster_url || "");
        setFondoPartidosUrl(data.match_poster_background_url || "");
        setAuspiciantes(Array.isArray(data.tournament_sponsors) ? data.tournament_sponsors.join("\n") : "");
      } else {
        clearActiveTournament();
        setTorneoId(null);
      }
    }
  };

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torneoId) return alert("No hay un torneo activo seleccionado.");
    setLoading(true);

    try {
      let nuevaUrlReglamento = reglamentoUrl;
      let nuevoBannerUrl = bannerUrl;
      let nuevoPosterUrl = posterUrl;
      let nuevoFondoPartidosUrl = fondoPartidosUrl;

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

      if (bannerArchivo) nuevoBannerUrl = await subirImagenTorneoSegura(bannerArchivo, "banner", torneoId, 1920);
      if (posterArchivo) nuevoPosterUrl = await subirImagenTorneoSegura(posterArchivo, "poster", torneoId, 1080);
      if (fondoPartidosArchivo) nuevoFondoPartidosUrl = await subirImagenTorneoSegura(fondoPartidosArchivo, "match-poster", torneoId, 1600);

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
        start_date: fechaInicio || null,
        estimated_end_date: fechaFin || null,
        match_duration_minutes: duracionPartido,
        break_between_matches_minutes: descansoPartidos,
        football_modality: modalidadFutbol,
        substitutes_count: numSuplentes,
        final_venue: canchaFinal || null,
        tournament_year: anioTorneo,
        is_auto_template_enabled: plantillaAutomatica,
        max_players_per_team: maxJugadoresEquipo,
        banner_url: nuevoBannerUrl || null,
        poster_url: nuevoPosterUrl || null,
        match_poster_background_url: nuevoFondoPartidosUrl || null,
        tournament_sponsors: auspiciantes.split("\n").map(item => item.trim()).filter(Boolean),
        configuration_completed: true
      }).eq("id", torneoId);

      if (error) throw error;

      alert("¡Configuración guardada con éxito!");
      cargarConfiguracion(); // Recargar datos frescos
      setReglamento(null); // Limpiar el input de archivo
      setBannerArchivo(null);
      setPosterArchivo(null);
      setFondoPartidosArchivo(null);

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
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modalidad</label>
              <select value={modalidadFutbol} onChange={e => setModalidadFutbol(Number(e.target.value))} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl outline-none">
                {[7, 8, 9, 11].map(numero => <option key={numero} value={numero}>Fútbol {numero}</option>)}
              </select>
            </div>
            <NumberField label="Suplentes por planilla" value={numSuplentes} onChange={setNumSuplentes} min={0} />
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cancha de la final</label>
              <input type="text" value={canchaFinal} onChange={e => setCanchaFinal(e.target.value)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl outline-none" placeholder="Ej: Estadio Reina del Cisne" />
            </div>
            <NumberField label="Año del torneo" value={anioTorneo} onChange={setAnioTorneo} min={2000} />
            <NumberField label="Duración por partido (min)" value={duracionPartido} onChange={setDuracionPartido} min={15} />
            <NumberField label="Descanso entre partidos (min)" value={descansoPartidos} onChange={setDescansoPartidos} min={0} />
            <DateField label="Fecha de inicio" value={fechaInicio} onChange={setFechaInicio} required />
            <DateField label="Finalización estimada" value={fechaFin} onChange={setFechaFin} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-pink-400 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Identidad Visual del Torneo</h3>
          <p className="text-gray-500 text-xs">Selecciona cualquier publicidad, diseño, eslogan o fotografía. La aplicación la optimiza automáticamente antes de publicarla.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ImageUpload label="Banner principal (horizontal)" currentUrl={bannerUrl} file={bannerArchivo} onChange={setBannerArchivo} />
            <ImageUpload label="Póster promocional (vertical)" currentUrl={posterUrl} file={posterArchivo} onChange={setPosterArchivo} />
            <ImageUpload label="Fondo para pósteres de partidos (opcional)" currentUrl={fondoPartidosUrl} file={fondoPartidosArchivo} onChange={setFondoPartidosArchivo} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-emerald-400 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Auspiciantes del Torneo</h3>
          <p className="text-gray-500 text-xs">Agrega un auspiciante por linea. Se mostraran en el portal publico del torneo.</p>
          <textarea
            value={auspiciantes}
            onChange={e => setAuspiciantes(e.target.value)}
            className="w-full min-h-32 p-3 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl focus:border-[#D4A017] outline-none transition-all"
            placeholder={"Dra. Gina Calva - Notaria Primera Del Canton Loja\nCafeteria Coffee Time\nMister Copy"}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-red-400 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Reglas Disciplinarias Automáticas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField label="Amarillas para suspensión" value={amarillasSuspension} onChange={setAmarillasSuspension} />
            <NumberField label="Partidos por acumulación" value={partidosSuspensionAmarillas} onChange={setPartidosSuspensionAmarillas} />
            <NumberField label="Partidos por roja" value={partidosSuspensionRoja} onChange={setPartidosSuspensionRoja} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-cyan-400 font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Plantilla Oficial Automatizada</h3>
          <p className="text-gray-500 text-xs">Opcional. Mantiene una nómina permanente con cédulas únicas por torneo. La planilla abierta por partido seguirá disponible para jugadores ocasionales.</p>
          <label className="flex items-center gap-3 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl p-4 cursor-pointer">
            <input type="checkbox" checked={plantillaAutomatica} onChange={e => setPlantillaAutomatica(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            <span className="text-white font-bold text-sm">Activar control estricto de plantilla oficial</span>
          </label>
          <div className="max-w-xs">
            <NumberField label="Máximo de jugadores por equipo" value={maxJugadoresEquipo} onChange={setMaxJugadoresEquipo} min={1} disabled={!plantillaAutomatica} />
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

function DateField({ label, value, onChange, required = false }: any) {
  return <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label><input type="date" required={required} value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl" style={{ colorScheme: "dark" }} /></div>;
}

function ImageUpload({ label, currentUrl, file, onChange }: any) {
  const preview = file ? URL.createObjectURL(file) : currentUrl;
  return <label className="block bg-[#1c1c1c] border border-dashed border-[#D4A017]/50 rounded-xl p-4 cursor-pointer hover:bg-[#242424] transition-colors">
    <span className="text-[10px] font-bold text-[#D4A017] uppercase tracking-widest">{label}</span>
    <div className="h-36 rounded-lg bg-[#0a0a0a] mt-3 bg-cover bg-center flex items-center justify-center text-gray-500 text-xs" style={preview ? { backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.35)),url("${preview}")` } : undefined}>{!preview && "Haz clic para seleccionar una imagen"}</div>
    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => onChange(e.target.files?.[0] || null)} className="hidden" />
    <span className="block text-gray-500 text-[10px] mt-2">{file ? file.name : currentUrl ? "Imagen actual. Selecciona otra para reemplazarla." : "JPG, PNG o WebP"}</span>
  </label>;
}

async function subirImagenTorneoSegura(file: File, tipo: string, torneoId: string, maxWidth: number) {
  const optimized = await comprimirImagen(file, `${tipo}-${torneoId}-${Date.now()}.webp`, maxWidth);
  const form = new FormData();
  form.append("tournament_id", torneoId);
  form.append("media_type", tipo);
  form.append("file", optimized);
  const response = await fetch("/api/tournaments/media", { method: "POST", credentials: "include", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo subir la imagen del torneo.");
  return data.url as string;
}

function comprimirImagen(file: File, name: string, maxWidth: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("La imagen seleccionada no es válida."));
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(new File([blob], name, { type: "image/webp" })) : reject(new Error("No se pudo optimizar la imagen.")), "image/webp", 0.78);
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
