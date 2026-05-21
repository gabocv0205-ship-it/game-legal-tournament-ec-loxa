"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FinanzasPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [inscripcion, setInscripcion] = useState(150);

  useEffect(() => {
    async function loadData() {
      const { data: tourney } = await supabase.from("tournaments").select("id, registration_fee").order("created_at", { ascending: false }).limit(1).single();
      if (tourney) {
        setInscripcion(Number(tourney.registration_fee || 150));
        const { data: teams } = await supabase.from("teams").select("*, payments(amount)").eq("tournament_id", tourney.id);
        const calc = teams?.map(t => ({
          ...t,
          pagado: t.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0,
          deuda: Number(tourney.registration_fee || 150) - (t.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0)
        }));
        setEquipos(calc || []);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white">Control Financiero</h2>
      <div className="bg-[#141414] rounded-2xl shadow-lg border border-[#2E2E2E] overflow-hidden">
        <table className="w-full text-left text-sm text-white">
          <thead className="bg-[#1c1c1c] text-gray-400 uppercase text-xs">
            <tr><th className="p-4">Equipo</th><th className="p-4 text-center">Pagado</th><th className="p-4 text-center">Saldo</th></tr>
          </thead>
          <tbody className="divide-y divide-[#2E2E2E]">
            {equipos.map(eq => (
              <tr key={eq.id}>
                <td className="p-4 font-bold">{eq.name}</td>
                <td className="p-4 text-center text-green-500 font-mono">${eq.pagado}</td>
                <td className="p-4 text-center text-red-500 font-mono font-bold">${eq.deuda > 0 ? eq.deuda : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
