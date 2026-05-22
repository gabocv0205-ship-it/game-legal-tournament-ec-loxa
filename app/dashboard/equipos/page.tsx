"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [escudo, setEscudo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para Edición
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");

  useEffect(() => {
    cargarEquipos();
  }, []);

  const cargarEquipos = async () => {
    const { data } = await supabase.from("teams").select("*").order("created_at", { ascending: false });
    if (data) setEquipos(data);
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
    setLoading(true);
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      if (!tourney) throw new Error("Debes configurar un torneo primero.");

      let escudoUrl = "";
      if (escudo) {
        const imagenComprimida = await comprimirImagen(escudo);
        const { error: uploadError } = await supabase.storage.from("escudos").upload(imagenComprimida.name, imagenComprimida);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("escudos").getPublicUrl(imagenComprimida.name);
        escudoUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from("teams").insert([{ name: nombre, shield_url: escudoUrl, tournament_id: tourney.id }]);
      if (error) throw error;

      setNombre(""); setEscudo(null); cargarEquipos();
    } catch (error: any) { alert("Error: " + error.message); } finally { setLoading(false); }
  };

  // --- NUEVAS FUNCIONES: ELIMINAR Y EDITAR ---
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white">Gestión de Clubes</h2>
      
      <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] shadow-lg">
        <form onSubmit={guardarEquipo} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre del Club</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 mt-1" placeholder="Ej: GAME-LEGAL FC" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Escudo (Opcional - Autocompresión)</label>
            <input type="file" accept="image/*" onChange={e => setEscudo(e.target.files?.[0] || null)} className="w-full p-3 mt-1" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)]">
            {loading ? "Procesando..." : "Registrar Club"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipos.map(eq => (
          <div key={eq.id} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-4 flex flex-col gap-3 group transition-all hover:border-[#D4A017]">
            <div className="flex items-center gap-4">
              {eq.shield_url ? (
                <img src={eq.shield_url} alt="Escudo" className="w-12 h-12 object-contain rounded-full bg-white/5" />
              ) : (
                <div className="w-12 h-12 bg-[#2E2E2E] rounded-full flex items-center justify-center text-xs font-black text-gray-500">🛡️</div>
              )}
              <div className="flex-1">
                {editandoId === eq.id ? (
                  <input type="text" value={nombreEditado} onChange={e => setNombreEditado(e.target.value)} className="w-full p-1 text-sm rounded bg-[#0a0a0a] border border-[#D4A017] text-white" autoFocus />
                ) : (
                  <p className="font-bold text-white text-lg">{eq.name}</p>
                )}
              </div>
            </div>
            
            {/* Controles Editar/Eliminar */}
            <div className="flex justify-end gap-3 border-t border-[#2E2E2E] pt-2 mt-2">
              {editandoId === eq.id ? (
                <>
                  <button onClick={() => setEditandoId(null)} className="text-xs font-bold text-gray-400 hover:text-white transition-all">Cancelar</button>
                  <button onClick={() => guardarEdicion(eq.id)} className="text-xs font-bold text-green-500 hover:text-green-400 transition-all">Guardar</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditandoId(eq.id); setNombreEditado(eq.name); }} className="text-xs font-bold text-[#D4A017] hover:text-yellow-300 transition-all">Editar</button>
                  <button onClick={() => eliminarEquipo(eq.id, eq.shield_url)} className="text-xs font-bold text-red-500 hover:text-red-400 transition-all">Eliminar</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
