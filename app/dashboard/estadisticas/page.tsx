"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function EstadisticasPage() {
  const [tabla, setTabla] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const { data: matches } = await supabase.from("matches").select("*, home:home_team_id(name), away:away_team_id(name)").eq("status", "finished");
      const stats: any = {};
      matches?.forEach(m => {
        [m.home.name, m.away.name].forEach(n => { if(!stats[n]) stats[n] = { pts:0, pj:0 }; });
        stats[m.home.name].pj++; stats[m.away.name].pj++;
        if (m.home_goals > m.away_goals) stats[m.home.name].pts += 3;
        else if (m.away_goals > m.home_goals) stats[m.away.name].pts += 3;
        else { stats[m.home.name].pts += 1; stats[m.away.name].pts += 1; }
      });
      setTabla(Object.entries(stats).sort((a: any, b: any) => b[1].pts - a[1].pts));
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-white">Tabla de Posiciones</h2>
      <div className="bg-[#141414] rounded-2xl shadow-lg border border-[#2E2E2E] overflow-hidden">
        <table className="w-full text-center text-sm text-white">
          <thead className="bg-[#1c1c1c] text-gray-400 uppercase text-xs">
            <tr><th className="p-4 text-left">Equipo</th><th className="p-4">PJ</th><th className="p-4">PTS</th></tr>
          </thead>
          <tbody className="divide-y divide-[#2E2E2E]">
            {tabla.map(([nombre, s]: any) => (
              <tr key={nombre}><td className="p-4 font-bold">{nombre}</td><td className="p-4">{s.pj}</td><td className="p-4 font-black text-[#D4A017]">{s.pts}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
