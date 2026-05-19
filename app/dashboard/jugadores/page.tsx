"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Player {
  id: string;
  full_name: string;
  cedula: string;
  team_id: string;
  yellow_cards: number;
  red_cards: number;
  suspended: boolean;
  teams?: { name: string; shield_url: string };
}

export default function JugadoresPage() {
  const [jugadores, setJugadores] = useState<Player[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  
  // Formulario
  const [teamId, setTeamId] = useState("");
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ text: "", type: "" });

  // Cargar datos
  const loadData = async () => {
    const { data: tourney } = await supabase.from("tournaments").select("id").order("created_at", { ascending: false }).limit(1).single();
    if (tourney) {
      setTournamentId(tourney.id);
      
      const { data: teams } = await supabase.from("teams").select("id, name, shield_url").eq("tournament_id", tourney.id);
      if (teams) setEquipos(teams);

      const { data: players } = await supabase
        .from("players")
        .select(`*, teams(name, shield_url)`)
        .eq("tournament_id", tourney.id)
        .order("created_at", { ascending: false });
      if (players) setJugadores(players);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Inscribir Jugador
  const handleInscribir = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ text: "", type: "" });

    try {
      const { error } = await supabase.from("players").insert([{
        tournament_id: tournamentId,
        team_id: teamId,
        full_name: nombre,
        cedula: cedula
      }]);

      if (error) {
        if (error.code === "23505") throw new Error(`Fraude detectado: La cédula ${cedula} ya está inscrita en el torneo.`);
        throw error;
      }

      setMensaje({ text: "Jugador inscrito correctamente.", type: "success" });
      setNombre(""); setCedula("");
      loadData(); // Recargar tabla
    } catch (err: any) {
      setMensaje({ text: `🚫 ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Actualizar Tarjetas
  const agregarTarjeta = async (id: string, tipo: 'yellow' | 'red', currentAmount: number) => {
    const field = tipo === 'yellow' ? 'yellow_cards' : 'red_cards';
    await supabase.from("players").update({ [field]: currentAmount + 1 }).eq("id", id);
    loadData(); // El trigger de SQL actualizará el estado "suspended", recargamos para verlo
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-gray-900">Plantillas y Disciplina</h2>
        <p className="text-gray-500">Inscribe jugadores y gestiona tarjetas. El sistema bloquea cédulas duplicadas automáticamente.</p>
      </div>

      {mensaje.text && (
        <div className={`p-3 rounded-xl font-bold text-sm ${mensaje.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {mensaje.text}
        </div>
      )}

      {/* Formulario de Inscripción */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleInscribir} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-500 uppercase">Equipo</label>
            <select value={teamId} onChange={e=>setTeamId(e.target.value)} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#D4A017] bg-gray-50" required>
              <option value="">Seleccionar Club...</option>
              {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-bold text-gray-500 uppercase">Cédula</label>
            <input type="text" value={cedula} onChange={e=>setCedula(e.target.value)} className="w-full p-2.5 border rounded-xl outline-none focus:border-[#D
