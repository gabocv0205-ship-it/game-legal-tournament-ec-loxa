"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Team {
  id: string;
  name: string;
  shield_url: string;
  paid: boolean;
  debt: number;
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Team[]>([]);
  const [nombre, setNombre] = useState("");
  const [shield, setShield] = useState("⚽");
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      // 1. Obtener el ID del torneo actual
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (tournament) {
        setTournamentId(tournament.id);
        // 2. Obtener los equipos asociados a ese torneo
        const { data: teams, error } = await supabase
          .from("teams")
          .select("*")
          .eq("tournament_id", tournament.id)
          .order("name", { ascending: true });

        if (!error && teams) setEquipos(teams);
      }
    }
    loadData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !tournamentId) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("teams")
        .insert([
          { tournament_id: tournamentId, name: nombre, shield_url: shield, paid: false, debt: 150 }
        ])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") throw new Error("Este nombre de equipo ya existe en este torneo.");
        throw error;
      }

      if (data) setEquipos([...equipos, data]);
      setNombre("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-gray-900">Clubes del Campeonato</h2>
        <p className="text-gray-500">Inscribe y administra los equipos participantes vinculados a la base de datos.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-800 p-3 rounded-xl font-bold text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* REGISTRO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold mb-4 text-gray-800 flex items-center gap-2">🛡️ Nuevo Club</h3>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Equipo</label>
              <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-sm outline-none" required placeholder="Ej: Águilas de Loja" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Identificador Visual (Emoji/Sigla)</label>
              <input type="text" value={shield} onChange={e=>setShield(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl mt-1 text-center text-xl outline-none" />
            </div>
            <button 
              type="submit" 
              disabled={loading || !tournamentId}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading ? "Registrando..." : "Confirmar Inscripción"}
            </button>
          </form>
        </div>

        {/* LISTADO EN VIVO */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipos.map(eq => (
            <div key={eq.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 border rounded-full flex items-center justify-center text-2xl shadow-sm">
                  {eq.shield_url || "⚽"}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg leading-tight">{eq.name}</h4>
                  <p className="text-xs text-gray-400 mt-1">Conectado a la nube</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${eq.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {eq.paid ? "Al Día" : "Pendiente"}
              </span>
            </div>
          ))}
          {equipos.length === 0 && (
            <div className="col-span-2 text-center py-12 border border-dashed rounded-2xl text-gray-400 font-medium">
              No hay equipos inscritos en el torneo activo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
