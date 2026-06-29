"use client";
import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { supabase } from "@/lib/supabase";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";
import { exportTeamPlayersPdf } from "@/lib/exportUtils";

export default function EquiposPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [torneoNombre, setTorneoNombre] = useState("Torneo seleccionado");
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [escudo, setEscudo] = useState<File | null>(null);
  const [previewEscudo, setPreviewEscudo] = useState("");
  const [dirigenteNombre, setDirigenteNombre] = useState("");
  const [dirigenteTelefono, setDirigenteTelefono] = useState("");
  const [dirigenteCorreo, setDirigenteCorreo] = useState("");
  const [dirigenteNotas, setDirigenteNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  
  // Estados para Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [dirigenteEditado, setDirigenteEditado] = useState({ name: "", phone: "", email: "", notes: "" });
  const [escudoEditado, setEscudoEditado] = useState<File | null>(null);
  const [previewEscudoEditado, setPreviewEscudoEditado] = useState("");
  const [exportandoEquipoId, setExportandoEquipoId] = useState<string | null>(null);

  useEffect(() => {
    cargarEquipos();
  }, []);

  const cargarEquipos = async () => {
    setCargandoDatos(true);
    try {
      // 1. AISLAMIENTO SAAS: Identificar el torneo activo
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      
      if (!activeId) {
        setCargandoDatos(false);
        return;
      }

      const tournament = await getAccessibleTournament(supabase, activeId, "id, name");
      if (!tournament) {
        clearActiveTournament();
        setEquipos([]);
        setTorneoId(null);
        setTorneoNombre("Torneo seleccionado");
        setCargandoDatos(false);
        return;
      }
      
      setTorneoId(activeId);
      setTorneoNombre((tournament as any).name || "Torneo seleccionado");

      // 2. Traer SOLO los equipos de este torneo
      const { data } = await supabase.from("teams")
        .select("*")
        .eq("tournament_id", activeId)
        .order("created_at", { ascending: false });
        
      if (data) setEquipos(data);
    } catch (error) {
      console.error("Error cargando equipos:", error);
    } finally {
      setCargandoDatos(false);
    }
  };

  const validarEscudo = (file: File) => {
    const tiposPermitidos = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(file.type)) {
      throw new Error("Formato no permitido. Usa JPG, JPEG, PNG o WEBP.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("El escudo supera el tamano maximo permitido de 5 MB.");
    }
  };

  const crearPreview = (file: File) => {
    validarEscudo(file);
    return URL.createObjectURL(file);
  };

  const seleccionarEscudoNuevo = (file?: File | null) => {
    if (previewEscudo) URL.revokeObjectURL(previewEscudo);
    if (!file) {
      setEscudo(null);
      setPreviewEscudo("");
      return;
    }
    try {
      setEscudo(file);
      setPreviewEscudo(crearPreview(file));
    } catch (error: any) {
      setEscudo(null);
      setPreviewEscudo("");
      alert(error.message || "No se pudo cargar el escudo.");
    }
  };

  const seleccionarEscudoEditado = (file?: File | null) => {
    if (previewEscudoEditado) URL.revokeObjectURL(previewEscudoEditado);
    if (!file) {
      setEscudoEditado(null);
      setPreviewEscudoEditado("");
      return;
    }
    try {
      setEscudoEditado(file);
      setPreviewEscudoEditado(crearPreview(file));
    } catch (error: any) {
      setEscudoEditado(null);
      setPreviewEscudoEditado("");
      alert(error.message || "No se pudo cargar el escudo.");
    }
  };

  // Motor de compresión a 50KB
  const comprimirImagen = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], `escudo-${Date.now()}.webp`, { type: "image/webp" });
              resolve(newFile);
            }
          }, "image/webp", 0.6);
        };
      };
    });
  };

  const guardarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torneoId) return alert("Error: No hay un torneo activo seleccionado.");
    if (!dirigenteNombre.trim()) return alert("Ingresa el nombre completo del dirigente.");
    if (!dirigenteTelefono.trim()) return alert("Ingresa el celular del dirigente.");
    const telefonoNormalizado = dirigenteTelefono.replace(/\D/g, "");
    if (equipos.some(eq => String(eq.manager_phone || "").replace(/\D/g, "") === telefonoNormalizado)) {
      return alert("Ya existe un equipo con ese celular de dirigente en este torneo.");
    }
    
    setLoading(true);
    try {
      let escudoUrl = "";
      if (escudo) {
        validarEscudo(escudo);
        const imagenComprimida = await comprimirImagen(escudo);
        const { error: uploadError } = await supabase.storage.from("escudos").upload(imagenComprimida.name, imagenComprimida);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("escudos").getPublicUrl(imagenComprimida.name);
        escudoUrl = publicUrlData.publicUrl;
      }

      // Inserción vinculada estrictamente al torneo activo
      const { error } = await supabase.from("teams").insert([{ 
        name: nombre, 
        shield_url: escudoUrl, 
        tournament_id: torneoId,
        manager_name: dirigenteNombre.trim(),
        manager_country_code: "+593",
        manager_phone: dirigenteTelefono.trim(),
        manager_email: dirigenteCorreo.trim() || null,
        manager_notes: dirigenteNotas.trim() || null
      }]);
      
      if (error) throw error;

      setNombre(""); 
      setEscudo(null); 
      if (previewEscudo) URL.revokeObjectURL(previewEscudo);
      setPreviewEscudo("");
      setDirigenteNombre("");
      setDirigenteTelefono("");
      setDirigenteCorreo("");
      setDirigenteNotas("");
      cargarEquipos();
    } catch (error: any) { 
      alert("Error: " + error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- FUNCIONES: ELIMINAR Y EDITAR ---
  const eliminarEquipo = async (id: string, shield_url: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este club? Esta acción es irreversible.")) return;
    try {
      if (shield_url) {
        const fileName = shield_url.split('/').pop();
        if (fileName) await supabase.storage.from("escudos").remove([fileName]);
      }
      await supabase.from("teams").delete().eq("id", id);
      cargarEquipos();
    } catch (error) { alert("Error al eliminar."); }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEscudoEditado(null);
    if (previewEscudoEditado) URL.revokeObjectURL(previewEscudoEditado);
    setPreviewEscudoEditado("");
  };

  const guardarEdicion = async (id: string) => {
    try {
      if (!dirigenteEditado.name.trim()) return alert("Ingresa el nombre completo del dirigente.");
      if (!dirigenteEditado.phone.trim()) return alert("Ingresa el celular del dirigente.");
      const telefonoNormalizado = dirigenteEditado.phone.replace(/\D/g, "");
      if (equipos.some(eq => eq.id !== id && String(eq.manager_phone || "").replace(/\D/g, "") === telefonoNormalizado)) {
        return alert("Ya existe otro equipo con ese celular de dirigente en este torneo.");
      }
      const equipoActual = equipos.find(eq => eq.id === id);
      let nuevoEscudoUrl = equipoActual?.shield_url || "";
      let escudoAnterior = "";

      if (escudoEditado) {
        validarEscudo(escudoEditado);
        const imagenComprimida = await comprimirImagen(escudoEditado);
        const { error: uploadError } = await supabase.storage.from("escudos").upload(imagenComprimida.name, imagenComprimida);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("escudos").getPublicUrl(imagenComprimida.name);
        nuevoEscudoUrl = publicUrlData.publicUrl;
        escudoAnterior = equipoActual?.shield_url || "";
      }

      const { error: updateError } = await supabase.from("teams").update({
        name: nombreEditado,
        shield_url: nuevoEscudoUrl,
        manager_name: dirigenteEditado.name.trim(),
        manager_country_code: "+593",
        manager_phone: dirigenteEditado.phone.trim(),
        manager_email: dirigenteEditado.email.trim() || null,
        manager_notes: dirigenteEditado.notes.trim() || null
      }).eq("id", id);
      if (updateError) throw updateError;

      if (escudoAnterior) {
        const fileName = escudoAnterior.split('/').pop();
        if (fileName) await supabase.storage.from("escudos").remove([fileName]);
      }

      cancelarEdicion();
      cargarEquipos();
    } catch (error: any) { alert("Error al actualizar: " + (error.message || "Intenta nuevamente.")); }
  };

  const estadoJugador = (jugador: any) => {
    const raw = String(jugador.status || jugador.estado || "").toLowerCase();
    if (jugador.suspended || jugador.is_suspended || raw.includes("suspend")) return "Suspendido";
    if (jugador.expelled || jugador.is_expelled || raw.includes("expuls")) return "Expulsado";
    if (raw.includes("no habil") || raw.includes("inhabil") || raw.includes("inactive") || raw.includes("inactivo")) return "No habilitado";
    return "Activo";
  };

  const descargarPdfJugadores = async (equipo: any) => {
    if (!torneoId) return alert("Selecciona un torneo antes de descargar el reporte.");
    setExportandoEquipoId(equipo.id);
    try {
      const { data: jugadores, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("tournament_id", torneoId)
        .eq("team_id", equipo.id)
        .order("full_name", { ascending: true });
      if (playersError) throw playersError;

      const playerIds = (jugadores || []).map((jugador: any) => jugador.id).filter(Boolean);
      const { data: eventos, error: eventsError } = playerIds.length
        ? await supabase.from("match_events").select("player_id, match_id, event_type").in("player_id", playerIds)
        : { data: [], error: null } as any;
      if (eventsError) throw eventsError;

      const stats = new Map<string, { goals: number; yellowCards: number; redCards: number; matches: Set<string> }>();
      playerIds.forEach((id: string) => stats.set(id, { goals: 0, yellowCards: 0, redCards: 0, matches: new Set<string>() }));
      (eventos || []).forEach((evento: any) => {
        const playerStats = stats.get(evento.player_id);
        if (!playerStats) return;
        const type = String(evento.event_type || "").toLowerCase();
        if (type.includes("gol") || type.includes("goal")) playerStats.goals += 1;
        if (type.includes("amarilla") || type.includes("yellow")) playerStats.yellowCards += 1;
        if (type.includes("roja") || type.includes("red")) playerStats.redCards += 1;
        if (evento.match_id) playerStats.matches.add(evento.match_id);
      });

      const rows = (jugadores || []).map((jugador: any, index: number) => {
        const playerStats = stats.get(jugador.id) || { goals: 0, yellowCards: 0, redCards: 0, matches: new Set<string>() };
        return {
          index: index + 1,
          fullName: jugador.full_name || jugador.name || "Sin nombre",
          identification: jugador.cedula || jugador.identification_number || jugador.document_number || "-",
          jerseyNumber: String(jugador.jersey_number || jugador.shirt_number || jugador.dorsal || jugador.numero_camiseta || jugador.number || "-"),
          status: estadoJugador(jugador),
          goals: playerStats.goals,
          yellowCards: playerStats.yellowCards,
          redCards: playerStats.redCards,
          matchesPlayed: playerStats.matches.size,
        };
      });

      const safeTeamName = String(equipo.name || "equipo").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      exportTeamPlayersPdf({
        tournamentName: torneoNombre,
        teamName: equipo.name || "Equipo",
        teamShieldUrl: equipo.shield_url || "",
        generatedAt: new Date().toLocaleString("es-EC"),
        rows,
      }, `jugadores-${safeTeamName || "equipo"}.pdf`);
    } catch (error: any) {
      alert("No se pudo generar el PDF: " + (error.message || "Intenta nuevamente."));
    } finally {
      setExportandoEquipoId(null);
    }
  };

  if (cargandoDatos) {
    return <div className="text-[#D4A017] text-center p-20 font-black animate-pulse">Sincronizando clubes inscritos...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white uppercase tracking-wider">Gestión de Clubes</h2>
      <p className="text-gray-400 text-sm">Administra los equipos participantes del torneo seleccionado.</p>
      
      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        <form onSubmit={guardarEquipo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre del Club</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors" placeholder="Ej: GAME-LEGAL FC" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Escudo (Opcional - Autocompresión)</label>
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={e => seleccionarEscudoNuevo(e.target.files?.[0] || null)} className="w-full p-3 mt-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20 transition-all cursor-pointer" />
              {previewEscudo && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3">
                  <NextImage src={previewEscudo} alt="Vista previa del escudo" width={48} height={48} unoptimized className="h-12 w-12 rounded-full bg-white/5 object-contain" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-[#D4A017]">Vista previa</p>
                    <button type="button" onClick={() => seleccionarEscudoNuevo(null)} className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white">Quitar imagen</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-[#D4A017]">Datos del dirigente</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre completo</label>
                <input type="text" value={dirigenteNombre} onChange={e => setDirigenteNombre(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="Ej: Carlos Andrade" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Celular (+593)</label>
                <input type="tel" value={dirigenteTelefono} onChange={e => setDirigenteTelefono(e.target.value)} required className="w-full p-3 mt-1 bg-[#141414] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="Ej: 0991234567" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Correo opcional</label>
                <input type="email" value={dirigenteCorreo} onChange={e => setDirigenteCorreo(e.target.value)} className="w-full p-3 mt-1 bg-[#141414] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="correo@dominio.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Observaciones</label>
                <input type="text" value={dirigenteNotas} onChange={e => setDirigenteNotas(e.target.value)} className="w-full p-3 mt-1 bg-[#141414] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="Notas internas" />
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#D4A017] text-black font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)] mt-2">
            {loading ? "Procesando..." : "Registrar Club Oficial"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipos.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 font-bold italic bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl">No hay equipos registrados en este torneo.</div>
        ) : (
          equipos.map(eq => (
            <div key={eq.id} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-4 flex flex-col gap-3 group transition-all hover:border-[#D4A017]">
              <div className="flex items-center gap-4">
                {(editandoId === eq.id && previewEscudoEditado) || eq.shield_url ? (
                  <NextImage src={(editandoId === eq.id && previewEscudoEditado) || eq.shield_url} alt={`Escudo de ${eq.name}`} width={48} height={48} unoptimized className="w-12 h-12 object-contain rounded-full bg-white/5" />
                ) : (
                  <div className="w-12 h-12 bg-[#2E2E2E] rounded-full flex items-center justify-center text-xs font-black text-gray-500">🛡️</div>
                )}
                <div className="flex-1">
                  {editandoId === eq.id ? (
                    <input type="text" value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} className="w-full p-1 text-sm rounded bg-[#0a0a0a] border border-[#D4A017] text-white outline-none" autoFocus />
                  ) : (
                    <p className="font-bold text-white text-lg uppercase tracking-wide">{eq.name}</p>
                  )}
                </div>
              </div>
              {editandoId === eq.id ? (
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3">
                  <div className="rounded-xl border border-[#2E2E2E] bg-[#141414] p-3">
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#D4A017]">Cambiar escudo</label>
                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={e => seleccionarEscudoEditado(e.target.files?.[0] || null)} className="w-full text-xs text-gray-400 file:mr-3 file:rounded-full file:border-0 file:bg-[#D4A017]/10 file:px-3 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:text-[#D4A017]" />
                    <p className="mt-2 text-[10px] text-gray-500">Opcional. Solo se reemplaza el escudo; los demas datos se conservan.</p>
                  </div>
                  <input type="text" value={dirigenteEditado.name} onChange={e => setDirigenteEditado(prev => ({ ...prev, name: e.target.value }))} className="w-full p-2 text-xs rounded bg-[#141414] border border-[#2E2E2E] text-white outline-none focus:border-[#D4A017]" placeholder="Dirigente" />
                  <input type="tel" value={dirigenteEditado.phone} onChange={e => setDirigenteEditado(prev => ({ ...prev, phone: e.target.value }))} className="w-full p-2 text-xs rounded bg-[#141414] border border-[#2E2E2E] text-white outline-none focus:border-[#D4A017]" placeholder="Celular" />
                  <input type="email" value={dirigenteEditado.email} onChange={e => setDirigenteEditado(prev => ({ ...prev, email: e.target.value }))} className="w-full p-2 text-xs rounded bg-[#141414] border border-[#2E2E2E] text-white outline-none focus:border-[#D4A017]" placeholder="Correo opcional" />
                  <input type="text" value={dirigenteEditado.notes} onChange={e => setDirigenteEditado(prev => ({ ...prev, notes: e.target.value }))} className="w-full p-2 text-xs rounded bg-[#141414] border border-[#2E2E2E] text-white outline-none focus:border-[#D4A017]" placeholder="Observaciones" />
                </div>
              ) : (
                <div className="rounded-xl border border-[#2E2E2E] bg-[#141414] p-3 text-xs">
                  <p className="font-black uppercase tracking-widest text-[#D4A017]">Dirigente</p>
                  <p className="mt-1 font-bold text-white">{eq.manager_name || "Sin registrar"}</p>
                  <p className="text-gray-400">+593 {eq.manager_phone || "-"}</p>
                  {eq.manager_email && <p className="text-gray-500">{eq.manager_email}</p>}
                </div>
              )}
              
              {/* Controles Editar/Eliminar */}
              <div className="flex justify-end gap-3 border-t border-[#2E2E2E] pt-3 mt-1">
                {editandoId === eq.id ? (
                  <>
                    <button onClick={cancelarEdicion} className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-white transition-all">Cancelar</button>
                    <button onClick={() => guardarEdicion(eq.id)} className="text-[10px] uppercase tracking-wider font-bold text-green-500 hover:text-green-400 transition-all">Guardar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => descargarPdfJugadores(eq)} disabled={exportandoEquipoId === eq.id} className="text-[10px] uppercase tracking-wider font-bold text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50">{exportandoEquipoId === eq.id ? "Generando..." : "PDF jugadores"}</button>
                    <button onClick={() => { cancelarEdicion(); setEditandoId(eq.id); setNombreEditado(eq.name); setDirigenteEditado({ name: eq.manager_name || "", phone: eq.manager_phone || "", email: eq.manager_email || "", notes: eq.manager_notes || "" }); }} className="text-[10px] uppercase tracking-wider font-bold text-[#D4A017] hover:text-yellow-300 transition-all">Editar</button>
                    <button onClick={() => eliminarEquipo(eq.id, eq.shield_url)} className="text-[10px] uppercase tracking-wider font-bold text-red-500 hover:text-red-400 transition-all">Eliminar</button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
