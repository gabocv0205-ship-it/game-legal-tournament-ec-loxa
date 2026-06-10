"use client";
import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { supabase } from "@/lib/supabase";

export default function EquiposPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [escudo, setEscudo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  
  // Estados para Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");

  useEffect(() => {
    cargarEquipos();
  }, []);

  const cargarEquipos = async () => {
    setCargandoDatos(true);
    try {
      // 1. AISLAMIENTO SAAS: Identificar el torneo activo
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      
      if (!activeId) {
        const { data: fallback } = await supabase.from('tournaments').select('id').limit(1).single();
        if (fallback) activeId = fallback.id;
      }
      
      if (!activeId) {
        setCargandoDatos(false);
        return;
      }
      
      setTorneoId(activeId);

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
    
    setLoading(true);
    try {
      let escudoUrl = "";
      if (escudo) {
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
        tournament_id: torneoId 
      }]);
      
      if (error) throw error;

      setNombre(""); 
      setEscudo(null); 
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

  const guardarEdicion = async (id: string) => {
    try {
      await supabase.from("teams").update({ name: nombreEditado }).eq("id", id);
      setEditandoId(null);
      cargarEquipos();
    } catch (error) { alert("Error al actualizar."); }
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
              <input type="file" accept="image/*" onChange={e => setEscudo(e.target.files?.[0] || null)} className="w-full p-3 mt-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#D4A017]/10 file:text-[#D4A017] hover:file:bg-[#D4A017]/20 transition-all cursor-pointer" />
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
                {eq.shield_url ? (
                  <NextImage src={eq.shield_url} alt={`Escudo de ${eq.name}`} width={48} height={48} unoptimized className="w-12 h-12 object-contain rounded-full bg-white/5" />
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
              
              {/* Controles Editar/Eliminar */}
              <div className="flex justify-end gap-3 border-t border-[#2E2E2E] pt-3 mt-1">
                {editandoId === eq.id ? (
                  <>
                    <button onClick={() => setEditandoId(null)} className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-white transition-all">Cancelar</button>
                    <button onClick={() => guardarEdicion(eq.id)} className="text-[10px] uppercase tracking-wider font-bold text-green-500 hover:text-green-400 transition-all">Guardar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditandoId(eq.id); setNombreEditado(eq.name); }} className="text-[10px] uppercase tracking-wider font-bold text-[#D4A017] hover:text-yellow-300 transition-all">Editar</button>
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
