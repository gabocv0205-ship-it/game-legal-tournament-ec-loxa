"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [escudo, setEscudo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarEquipos();
  }, []);

  const cargarEquipos = async () => {
    const { data } = await supabase.from("teams").select("*").order("created_at", { ascending: false });
    if (data) setEquipos(data);
  };

  // 🚀 MOTOR DE COMPRESIÓN A 50KB (Cero dependencias)
  const comprimirImagen = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400; // Tamaño ideal para escudos
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convertir a WebP con calidad 0.6 para garantizar ~50KB
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], `escudo-${Date.now()}.webp`, { type: "image/webp" });
              resolve(newFile);
            }
          }, "image/webp", 0.6);
        };
      };
    }); // <-- Aquí estaba el error, faltaba el paréntesis de cierre
  };

  const guardarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Obtener el ID del torneo activo
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      if (!tourney) throw new Error("Debes configurar un torneo primero.");

      let escudoUrl = "";

      // 2. Si hay imagen, comprimir y subir a Storage
      if (escudo) {
        const imagenComprimida = await comprimirImagen(escudo);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("escudos")
          .upload(imagenComprimida.name, imagenComprimida);

        if (uploadError) throw uploadError;

        // Obtener el link público de la imagen
        const { data: publicUrlData } = supabase.storage.from("escudos").getPublicUrl(imagenComprimida.name);
        escudoUrl = publicUrlData.publicUrl;
      }

      // 3. Guardar en la base de datos
      const { error: insertError } = await supabase.from("teams").insert([{
        name: nombre,
        shield_url: escudoUrl,
        tournament_id: tourney.id
      }]);

      if (insertError) throw insertError;

      // Limpiar y recargar
      setNombre("");
      setEscudo(null);
      cargarEquipos();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Escudo del Club (Se comprimirá automáticamente)</label>
            <input type="file" accept="image/*" onChange={e => setEscudo(e.target.files?.[0] || null)} className="w-full p-3 mt-1 bg-[#1c1c1c] text-white border border-[#2e2e2e] rounded-xl" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl hover:bg-yellow-500 transition-all">
            {loading ? "Procesando Escudo..." : "Registrar Club"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {equipos.map(eq => (
          <div key={eq.id} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-4 flex items-center gap-4">
            {eq.shield_url ? (
              <img src={eq.shield_url} alt="Escudo" className="w-12 h-12 object-contain rounded-full bg-white/5" />
            ) : (
              <div className="w-12 h-12 bg-[#2E2E2E] rounded-full flex items-center justify-center text-xs font-black text-gray-500">🛡️</div>
            )}
            <p className="font-bold text-white">{eq.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
