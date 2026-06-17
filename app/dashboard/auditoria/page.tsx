"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";

export default function AuditoriaPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const tournamentId = localStorage.getItem("activeTournamentId");
      if (!tournamentId) return setMessage("Selecciona primero un torneo.");
      const tournament = await getAccessibleTournament(supabase, tournamentId, "id");
      if (!tournament) {
        clearActiveTournament();
        setEntries([]);
        return setMessage("No tienes acceso a ese torneo. Selecciona un torneo propio.");
      }
      const { data, error } = await supabase.from("audit_log").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: false }).limit(200);
      if (error) return setMessage("Ejecuta production_hardening.sql para activar la auditoría.");
      setEntries(data || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2E2E2E] pb-4">
        <h2 className="text-3xl font-black uppercase">Auditoría del torneo</h2>
        <p className="text-gray-400 text-sm mt-1">Historial inmutable de modificaciones operativas.</p>
      </div>
      {message && <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800 text-blue-200">{message}</div>}
      <div className="bg-[#141414] border border-[#2E2E2E] rounded-2xl overflow-hidden">
        {entries.length === 0 ? <p className="p-8 text-center text-gray-500">Todavía no existen movimientos auditados.</p> : entries.map(entry => (
          <div key={entry.id} className="grid md:grid-cols-[150px_130px_130px_1fr] gap-3 p-4 border-b border-[#2E2E2E] text-xs">
            <span className="text-gray-400">{new Date(entry.created_at).toLocaleString("es-EC")}</span>
            <span className="text-[#D4A017] font-black uppercase">{entry.table_name}</span>
            <span className={`font-black uppercase ${entry.action === "delete" ? "text-red-400" : entry.action === "insert" ? "text-green-400" : "text-blue-400"}`}>{entry.action}</span>
            <span className="text-gray-500 truncate">Registro: {entry.record_id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
