"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { QRCodeSVG } from "qrcode.react";

export default function PartidosPage() {
  const [torneoSlug, setTorneoSlug] = useState<string>("");
  const [torneoId, setTorneoId] = useState<string | null>(null);
  
  const [partidos, setPartidos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Tabs de Programación
  const [modoProgramacion, setModoProgramacion] = useState<"manual" | "automatico" | "eliminatorias">("manual");
  const opcionesFase = ["Fase de Grupos", "16vos de Final", "Octavos de Final", "Cuartos de Final", "Semifinal", "Tercer Lugar", "Final"];

  // Estados Formularios
  const [localId, setLocalId] = useState("");
  const [visitanteId, setVisitanteId] = useState("");
  const [fecha, setFecha] = useState("");
  const [jornadaManual, setJornadaManual] = useState<number>(1);
  const [canchaManual, setCanchaManual] = useState("Cancha 1");
  const [faseManual, setFaseManual] = useState("Fase de Grupos");

  const [autoJornada, setAutoJornada] = useState<number>(1);
  const [autoDia, setAutoDia] = useState("");
  const [autoHoraInicio, setAutoHoraInicio] = useState("09:00");
  const [autoDuracion, setAutoDuracion] = useState<number>(60);
  const [autoCancha, setAutoCancha] = useState("Cancha 1");
  const [autoFase, setAutoFase] = useState("Fase de Grupos");
  const [idaYVuelta, setIdaYVuelta] = useState<boolean>(false);

  const [formatoEliminatoria, setFormatoEliminatoria] = useState("Un Solo Partido (Playoff)");
  const [faseGenerar, setFaseGenerar] = useState("Cuartos de Final");

  const [filtroJornada, setFiltroJornada] = useState<number | "">("");
  const capturaRef = useRef<HTMLDivElement>(null);
  const [appUrl, setAppUrl] = useState("");
  
  // Estado para impresión
  const [partidoImprimir, setPartidoImprimir] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, []);

  const cargarDatos = async () => {
    let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
    if (!activeId) return;
    setTorneoId(activeId);

    const { data: tourney } = await supabase.from('tournaments').select('slug').eq('id', activeId).single();
    if (tourney) setTorneoSlug(tourney.slug);

    const { data: teamsData } = await supabase.from("teams").select("id, name").eq("tournament_id", activeId).order("name");
    if (teamsData) setEquipos(teamsData);

    const { data: matchesData } = await supabase.from("matches")
      .select("*, home:home_team_id(name, shield_url), away:away_team_id(name, shield_url)")
      .eq("tournament_id", activeId).order("match_date", { ascending: true });
    if (matchesData) setPartidos(matchesData);
  };

  const programarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localId === visitanteId) return alert("Un equipo no puede jugar contra sí mismo.");
    if (!torneoId) return alert("No hay torneo activo.");
    setLoading(true);
    try {
      const { error } = await supabase.from("matches").insert([{
        tournament_id: torneoId, home_team_id: localId, away_team_id: visitanteId,
        match_date: fecha, matchday: jornadaManual, pitch: canchaManual, stage: faseManual
      }]);
      if (error) throw error;
      setLocalId(""); setVisitanteId(""); setFecha(""); cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  // ============================================================================
  // GENERADOR DE HORARIOS CORREGIDO
  // ============================================================================
  const generarFechaAutomatica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDia || !autoHoraInicio) return alert("Faltan datos de fecha/hora.");
    if (!torneoId) return alert("No hay torneo activo.");
    if (!window.confirm(`¿Generar Fecha ${autoJornada} de ${autoFase}?`)) return;
    setLoading(true);
    
    try {
      const historialCruces = new Set(partidos.map(p => `${p.home_team_id}-${p.away_team_id}`));
      const historialCrucesInverso = new Set(partidos.map(p => `${p.away_team_id}-${p.home_team_id}`));
      
      let matchesToInsert: any[] = [];
      // Se inicializa la fecha en la zona horaria local correcta
      let relojCancha = new Date(`${autoDia}T${autoHoraInicio}:00`);
      let maxIntentos = 100, exito = false;

      while (maxIntentos > 0 && !exito) {
        let equiposDisponibles = [...equipos];
        let combinacionValida = true;
        let tempMatches: any[] = [];
        
        for (let i = equiposDisponibles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [equiposDisponibles[i], equiposDisponibles[j]] = [equiposDisponibles[j], equiposDisponibles[i]];
        }
        
        while (equiposDisponibles.length >= 2) {
          const homeTeam = equiposDisponibles.pop();
          const awayTeam = equiposDisponibles.pop();
          const cruce1 = `${homeTeam.id}-${awayTeam.id}`;
          const cruce2 = `${awayTeam.id}-${homeTeam.id}`;
          
          let yaJugaron = idaYVuelta 
            ? (historialCruces.has(cruce1) || historialCruces.has(cruce2)) 
            : (historialCruces.has(cruce1) || historialCrucesInverso.has(cruce1) || historialCruces.has(cruce2) || historialCrucesInverso.has(cruce2));
          
          if (yaJugaron) { combinacionValida = false; break; }
          tempMatches.push({ tournament_id: torneoId, home_team_id: homeTeam.id, away_team_id: awayTeam.id, matchday: autoJornada, pitch: autoCancha, stage: autoFase });
        }

        if (combinacionValida) {
          // Asignación de horarios matemáticamente lineal
          matchesToInsert = tempMatches.map((match) => {
             const fechaIso = relojCancha.toISOString(); // Formato seguro para BD
             relojCancha.setMinutes(relojCancha.getMinutes() + autoDuracion); // Suma los minutos para el siguiente
             return { ...match, match_date: fechaIso };
          });
          exito = true;
        }
        maxIntentos--;
      }
      
      if (!exito) throw new Error("No se pudo generar. Equipos agotaron cruces posibles para este formato.");
      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      
      alert(`¡Fecha ${autoJornada} generada con éxito!`); 
      cargarDatos();
    } catch (error: any) { alert(error.message); } finally { setLoading(false); }
  };

  const generarLlavesAutomaticas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoDia || !autoHoraInicio) return alert("Define el día y la hora de inicio.");
    if (!torneoId) return alert("No hay torneo activo.");
    if (!window.confirm(`¿Calcular clasificados y generar ${faseGenerar}?`)) return;
    setLoading(true);

    try {
      const matchesGrupos = partidos.filter(p => p.stage === "Fase de Grupos" && p.status === "finished");
      const stats: Record<string, any> = {};
      equipos.forEach(t => { stats[t.id] = { id: t.id, gf: 0, gc: 0, pts: 0 }; });
      
      matchesGrupos.forEach(m => {
        if (stats[m.home_team_id] && stats[m.away_team_id]) {
          stats[m.home_team_id].gf += m.home_goals || 0; stats[m.away_team_id].gf += m.away_goals || 0;
          stats[m.home_team_id].gc += m.away_goals || 0; stats[m.away_team_id].gc += m.home_goals || 0;
          if (m.home_goals > m.away_goals) stats[m.home_team_id].pts += 3;
          else if (m.away_goals > m.home_goals) stats[m.away_team_id].pts += 3;
          else { stats[m.home_team_id].pts += 1; stats[m.away_team_id].pts += 1; }
        }
      });

      const clasificacionGlobal = Object.values(stats)
        .map(s => ({ ...s, gd: s.gf - s.gc }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

      let numEquipos = faseGenerar === "Octavos de Final" ? 16 : faseGenerar === "Cuartos de Final" ? 8 : faseGenerar === "Semifinal" ? 4 : 2;

      if (clasificacionGlobal.length < numEquipos) throw new Error("No hay suficientes equipos.");

      const clasificados = clasificacionGlobal.slice(0, numEquipos);
      let matchesToInsert: any[] = [];
      let relojCancha = new Date(`${autoDia}T${autoHoraInicio}:00`);

      for (let i = 0; i < numEquipos / 2; i++) {
        const mejor = clasificados[i];
        const peor = clasificados[numEquipos - 1 - i];

        matchesToInsert.push({
          tournament_id: torneoId, home_team_id: mejor.id, away_team_id: peor.id,
          matchday: autoJornada, pitch: autoCancha, stage: faseGenerar, match_date: relojCancha.toISOString()
        });
        relojCancha.setMinutes(relojCancha.getMinutes() + autoDuracion);

        if (formatoEliminatoria === "Ida y Vuelta (Estilo Libertadores)") {
           matchesToInsert.push({
             tournament_id: torneoId, home_team_id: peor.id, away_team_id: mejor.id,
             matchday: autoJornada + 1, pitch: autoCancha, stage: `${faseGenerar} (Vuelta)`, match_date: relojCancha.toISOString()
           });
           relojCancha.setMinutes(relojCancha.getMinutes() + autoDuracion);
        }
      }

      const { error } = await supabase.from("matches").insert(matchesToInsert);
      if (error) throw error;
      
      alert(`¡Llaves de ${faseGenerar} creadas!`);
      cargarDatos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  const eliminarPartido = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este partido?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
      cargarDatos();
    } catch (error: any) { alert("Error al eliminar."); } finally { setLoading(false); }
  };

  const descargarCalendario = async () => {
    if (!capturaRef.current) return; setLoading(true);
    try {
      capturaRef.current.style.display = "block";
      const canvas = await html2canvas(capturaRef.current, { backgroundColor: "#0a0a0a", scale: 2, useCORS: true });
      capturaRef.current.style.display = "none";
      const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `Programacion.png`; link.click();
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

  // Función para imprimir la planilla física
  const imprimirPlanilla = (partido: any) => {
    setPartidoImprimir(partido);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const partidosFiltrados = filtroJornada ? partidos.filter(p => p.matchday === filtroJornada) : partidos;

  return (
    <>
      {/* Estilos para impresión (Oculta la UI web y muestra solo la planilla en formato horizontal) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #zona-impresion, #zona-impresion * { visibility: visible; }
          #zona-impresion { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0; margin: 0;}
          @page { size: landscape; margin: 10mm; }
        }
      `}} />

      <div className="space-y-6 max-w-6xl mx-auto px-4 pb-16">
        
        {/* Cabecera y Tabs SaaS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-4 gap-4 mt-6">
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Gestión de Calendario</h2>
            <p className="text-gray-400 text-sm mt-1">Programa partidos y genera planillas de vocalía físicas.</p>
          </div>
          <div className="bg-[#1C1C1C] p-1.5 rounded-xl border border-gray-800 flex w-full md:w-auto shadow-lg">
            <button onClick={() => setModoProgramacion("manual")} className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${modoProgramacion === "manual" ? "bg-[#D4A017] text-black shadow-md" : "text-gray-400 hover:text-white"}`}>Manual</button>
            <button onClick={() => setModoProgramacion("automatico")} className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${modoProgramacion === "automatico" ? "bg-[#D4A017] text-black shadow-md" : "text-gray-400 hover:text-white"}`}>⚡ Automático</button>
            <button onClick={() => setModoProgramacion("eliminatorias")} className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${modoProgramacion === "eliminatorias" ? "bg-[#D4A017] text-black shadow-md" : "text-gray-400 hover:text-white"}`}>🏆 Fases</button>
          </div>
        </div>
        
        {/* Formularios */}
        <div className="bg-[#141414] p-6 rounded-2xl border border-gray-800 shadow-xl">
          {modoProgramacion === "manual" && (
            <form onSubmit={programarPartido} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-2"><label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Escuadra Local</label><select value={localId} onChange={e => setLocalId(e.target.value)} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none"><option value="" disabled>Seleccionar...</option>{equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}</select></div>
              <div className="md:col-span-2"><label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Escuadra Visitante</label><select value={visitanteId} onChange={e => setVisitanteId(e.target.value)} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none"><option value="" disabled>Seleccionar...</option>{equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Instancia</label><select value={faseManual} onChange={e => setFaseManual(e.target.value)} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none">{opcionesFase.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">N° Fecha</label><input type="number" value={jornadaManual} onChange={e => setJornadaManual(Number(e.target.value))} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Cancha</label><input type="text" value={canchaManual} onChange={e => setCanchaManual(e.target.value)} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" placeholder="Cancha 1" /></div>
              <div className="md:col-span-3"><label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Cronograma</label><input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" style={{ colorScheme: 'dark' }} /></div>
              <button type="submit" disabled={loading} className="md:col-span-2 py-3.5 bg-[#D4A017] text-black font-black uppercase tracking-wider rounded-xl hover:brightness-110 transition-all">{loading ? "Guardando..." : "Programar Partido"}</button>
            </form>
          )}

          {modoProgramacion === "automatico" && (
            <form onSubmit={generarFechaAutomatica} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-[#1C1C1C] p-6 border border-[#D4A017]/30 rounded-2xl relative overflow-hidden">
              <div className="md:col-span-6 flex items-center justify-between border-b border-gray-800 pb-3 mb-2 relative z-10">
                <h4 className="text-white font-black uppercase text-sm"><i className="fa-solid fa-bolt text-[#D4A017]"></i> Generador de Fase de Grupos</h4>
                <label className="flex items-center gap-2 cursor-pointer bg-black px-3 py-1.5 rounded-lg border border-gray-800">
                  <input type="checkbox" checked={idaYVuelta} onChange={e => setIdaYVuelta(e.target.checked)} className="w-4 h-4 accent-[#D4A017]" />
                  <span className="text-gray-300 font-bold text-xs uppercase">Torneo Ida y Vuelta</span>
                </label>
              </div>
              <div className="relative z-10"><label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Día de Juego</label><input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" style={{ colorScheme: 'dark' }} /></div>
              <div className="relative z-10"><label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Hora 1er Partido</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" style={{ colorScheme: 'dark' }} /></div>
              <div className="relative z-10"><label className="text-xs font-bold text-gray-500 uppercase">Duración (Min)</label><input type="number" value={autoDuracion} onChange={e => setAutoDuracion(Number(e.target.value))} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" /></div>
              <div className="relative z-10"><label className="text-xs font-bold text-gray-500 uppercase">Número Fecha</label><input type="number" value={autoJornada} onChange={e => setAutoJornada(Number(e.target.value))} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" /></div>
              <div className="relative z-10"><label className="text-xs font-bold text-gray-500 uppercase">Instancia</label><select value={autoFase} onChange={e => setAutoFase(e.target.value)} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none">{opcionesFase.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
              <button type="submit" disabled={loading} className="py-3.5 bg-[#D4A017] text-black font-black uppercase tracking-wider rounded-xl hover:brightness-110 transition-all relative z-10">⚡ Generar</button>
            </form>
          )}

          {modoProgramacion === "eliminatorias" && (
            <div className="bg-[#1C1C1C] p-6 border border-yellow-600/50 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A017]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 border-b border-gray-800 pb-4 mb-4">
                <h4 className="text-[#D4A017] font-black uppercase text-lg mb-1">🏆 Creador de Llaves</h4>
                <p className="text-gray-400 text-xs">Cruza automáticamente al Mejor vs el Peor clasificado de la tabla global.</p>
              </div>
              <form onSubmit={generarLlavesAutomaticas} className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                 <div className="md:col-span-2"><label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Formato de Llave</label><select value={formatoEliminatoria} onChange={e => setFormatoEliminatoria(e.target.value)} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none"><option>Un Solo Partido (Playoff)</option><option>Ida y Vuelta (Estilo Libertadores)</option></select></div>
                 <div className="md:col-span-2"><label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Fase a Generar</label><select value={faseGenerar} onChange={e => setFaseGenerar(e.target.value)} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none"><option>Octavos de Final</option><option>Cuartos de Final</option><option>Semifinal</option><option>Final</option></select></div>
                 
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Día</label><input type="date" value={autoDia} onChange={e => setAutoDia(e.target.value)} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" style={{ colorScheme: 'dark' }} /></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Hora Inicio</label><input type="time" value={autoHoraInicio} onChange={e => setAutoHoraInicio(e.target.value)} required className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" style={{ colorScheme: 'dark' }} /></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase">Duración</label><input type="number" value={autoDuracion} onChange={e => setAutoDuracion(Number(e.target.value))} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" /></div>
                 <div><label className="text-xs font-bold text-gray-500 uppercase">N° Fecha</label><input type="number" value={autoJornada} onChange={e => setAutoJornada(Number(e.target.value))} className="w-full p-3 mt-1 bg-black text-white border border-gray-800 rounded-xl outline-none" /></div>
                 <div className="md:col-span-4 mt-2"><button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black text-sm font-black uppercase tracking-widest rounded-xl hover:scale-[1.01] transition-transform">⚡ Calcular Clasificados y Armar Llaves</button></div>
              </form>
            </div>
          )}
        </div>

        {/* Lista de Partidos y Exportaciones */}
        <div className="bg-[#1C1C1C] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
          <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-white font-black uppercase tracking-widest">Calendario de Juegos</h3>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select value={filtroJornada} onChange={e => setFiltroJornada(e.target.value ? Number(e.target.value) : "")} className="bg-black text-[#D4A017] font-black border border-gray-800 p-2.5 rounded-lg outline-none text-xs uppercase tracking-widest flex-1 sm:flex-none">
                <option value="">Todas las Fechas</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>Fecha {n}</option>)}
              </select>
              <button onClick={descargarCalendario} className="bg-transparent border border-gray-600 hover:border-[#D4A017] text-gray-300 hover:text-[#D4A017] font-black uppercase text-xs px-4 py-2.5 rounded-lg transition-all">
                📸 Póster
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 gap-4">
            {partidosFiltrados.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No hay partidos programados.</p>
            ) : (
              partidosFiltrados.map(p => (
                <div key={p.id} className="bg-black border border-gray-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 hover:border-[#D4A017]/50 transition-colors">
                  <div className="text-center md:text-left w-full md:w-auto">
                    <span className="font-mono text-[10px] text-[#D4A017] uppercase font-bold tracking-widest block mb-1">
                      Fecha {p.matchday} • {p.stage}
                    </span>
                    <p className="text-sm font-black text-white">
                      {new Date(p.match_date).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase block mt-1">{p.pitch || "Cancha Principal"}</span>
                  </div>

                  <div className="flex items-center gap-4 justify-center w-full md:w-auto flex-1">
                    <span className="text-sm font-black text-white text-right flex-1 truncate uppercase">{p.home?.name}</span>
                    <div className="bg-[#141414] px-4 py-2 rounded-lg font-mono font-black text-gray-500 text-sm border border-gray-800">VS</div>
                    <span className="text-sm font-black text-white text-left flex-1 truncate uppercase">{p.away?.name}</span>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <button onClick={() => imprimirPlanilla(p)} className="flex-1 md:flex-none px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-black rounded-lg text-xs uppercase tracking-widest transition-all">
                      🖨️ Planilla
                    </button>
                    <button onClick={() => eliminarPartido(p.id)} className="flex-1 md:flex-none px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 font-black rounded-lg text-xs uppercase tracking-widest transition-all">
                      Borrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ==============================================================================
          📸 LIENZO DE CAPTURA PÓSTER (OCULTO)
          ============================================================================== */}
      <div style={{ display: "none" }} ref={capturaRef}>
        <div className="bg-[#0a0a0a] p-10 w-[800px] font-sans relative overflow-hidden border-8 border-[#D4A017]">
          <div className="flex justify-between items-start mb-10 relative z-10 border-b border-[#2E2E2E] pb-6">
            <div>
              <h1 className="text-4xl font-black text-white tracking-widest uppercase">CRONOGRAMA OFICIAL</h1>
              <p className="text-[#D4A017] font-bold text-xl tracking-widest uppercase mt-2">
                {partidosFiltrados.length > 0 ? partidosFiltrados[0].stage.toUpperCase() : "TODOS LOS PARTIDOS"} {filtroJornada ? ` - FECHA ${filtroJornada}` : ""}
              </p>
            </div>
            <div className="bg-[#1C1C1C] p-2 rounded-xl flex flex-col items-center shadow-2xl border border-[#D4A017]">
              {appUrl && <QRCodeSVG value={appUrl} size={70} level={"H"} fgColor="#D4A017" bgColor="#1C1C1C" />}
            </div>
          </div>
          <div className="space-y-4 relative z-10">
            {partidosFiltrados.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#141414] border border-[#2e2e2e] rounded-full pr-6 pl-6 py-2 shadow-lg relative h-20">
                <div className="flex-1 flex items-center justify-end gap-4">
                  <span className="font-black text-white text-xl uppercase tracking-wider">{p.home?.name}</span>
                  {p.home?.shield_url ? <img src={p.home.shield_url} crossOrigin="anonymous" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 bg-[#2e2e2e] rounded-full"></div>}
                </div>
                <div className="w-24 flex flex-col items-center justify-center relative z-20 mx-4 h-full">
                  <span className="text-[#D4A017] font-black text-sm absolute -bottom-2 bg-black px-3 py-1 rounded-full border border-gray-800">{new Date(p.match_date).toLocaleTimeString('es-EC', { hour: '2-digit', minute:'2-digit' }).replace(':', 'H')}</span>
                </div>
                <div className="flex-1 flex items-center justify-start gap-4">
                  {p.away?.shield_url ? <img src={p.away.shield_url} crossOrigin="anonymous" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 bg-[#2e2e2e] rounded-full"></div>}
                  <span className="font-black text-white text-xl uppercase tracking-wider">{p.away?.name}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12 bg-[#D4A017] py-2 rounded-xl text-black font-black uppercase tracking-[0.2em] text-xs">Powered by GAME-LEGAL PRO</div>
        </div>
      </div>

      {/* ==============================================================================
          🖨️ ZONA DE IMPRESIÓN: PLANILLA DE VOCALÍA (SOLO VISIBLE AL IMPRIMIR)
          ============================================================================== */}
      {partidoImprimir && (
        <div id="zona-impresion" className="hidden bg-white text-black font-sans p-4 h-screen w-screen flex-col justify-center items-center">
          
          {/* Se replica la planilla dos veces para que al imprimir en Landscape y cortar por la mitad, se tengan 2 hojas A5 */}
          {[1, 2].map((num) => (
            <div key={num} className="w-[48%] h-[95%] float-left border-2 border-black p-4 m-[1%] relative box-border">
              {/* Encabezado */}
              <div className="text-center border-b-2 border-black pb-2 mb-4">
                <h1 className="text-xl font-black uppercase tracking-widest">Planilla de Juego Oficial</h1>
                <p className="text-xs font-bold uppercase mt-1">Torneo Generado por GAME-LEGAL PRO</p>
                <div className="flex justify-between text-xs mt-3 font-bold border border-black p-2 bg-gray-100">
                  <span>Fecha: {partidoImprimir.matchday}</span>
                  <span>{new Date(partidoImprimir.match_date).toLocaleDateString('es-EC')} - {new Date(partidoImprimir.match_date).toLocaleTimeString('es-EC', { hour: '2-digit', minute:'2-digit' })}</span>
                  <span>Cancha: {partidoImprimir.pitch || "Central"}</span>
                </div>
              </div>

              {/* Marcador Principal */}
              <div className="flex justify-between items-center px-4 mb-4">
                <div className="text-center w-[40%]">
                  <h2 className="text-sm font-black uppercase border-b border-black pb-1 mb-2">LOCAL</h2>
                  <h3 className="text-lg font-black uppercase truncate">{partidoImprimir.home?.name}</h3>
                </div>
                <div className="w-[15%] text-center text-3xl font-black">
                  VS
                </div>
                <div className="text-center w-[40%]">
                  <h2 className="text-sm font-black uppercase border-b border-black pb-1 mb-2">VISITANTE</h2>
                  <h3 className="text-lg font-black uppercase truncate">{partidoImprimir.away?.name}</h3>
                </div>
              </div>

              {/* Tabla de Eventos (Goles / Tarjetas) */}
              <table className="w-full text-left text-[10px] border-collapse mb-4 mt-6">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-1 text-center w-8">N°</th>
                    <th className="border border-black p-1 w-[40%]">Jugador (Local)</th>
                    <th className="border border-black p-1 text-center">Gol</th>
                    <th className="border border-black p-1 text-center">TA</th>
                    <th className="border border-black p-1 text-center">TR</th>
                    <th className="border border-black p-1 bg-black"></th>
                    <th className="border border-black p-1 text-center w-8">N°</th>
                    <th className="border border-black p-1 w-[40%]">Jugador (Visitante)</th>
                    <th className="border border-black p-1 text-center">Gol</th>
                    <th className="border border-black p-1 text-center">TA</th>
                    <th className="border border-black p-1 text-center">TR</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(12)].map((_, i) => (
                    <tr key={i}>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5 bg-gray-300"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Firmas en la parte inferior */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] font-bold text-center">
                <div className="w-[30%]">
                  <div className="border-b border-black h-8 mb-1"></div>
                  Firma Capitán Local
                </div>
                <div className="w-[30%]">
                  <div className="border-b border-black h-8 mb-1"></div>
                  Firma Árbitro / Vocal
                </div>
                <div className="w-[30%]">
                  <div className="border-b border-black h-8 mb-1"></div>
                  Firma Capitán Visitante
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
