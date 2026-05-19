"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function EstadisticasPage() {
  const [tabla, setTabla] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const { data: matches } = await supabase.from("matches").select("*, home:home_team_id(name), away:away_team_id(name)").eq("status", "finished");
      
      // Motor de cálculo de puntos (Lógica de servidor simplificada en frontend)
      const stats: any = {};
      matches?.forEach(m => {
        [m.home.name, m.away.name].forEach(n => { if(!stats[n]) stats[n] = { pts:0, gf:0, gc:0, pj:0 }; });
        
        stats[m.home.name].pj++; stats[m.away.name].pj++;
        stats[m.home.name].gf += m.home_goals; stats[m.away.name].gc += m.home_goals;
        stats[m.away.name].gf += m.away_goals; stats[m.home.name].gc += m.away_goals;

        if (m.home_goals > m.away_goals) stats[m.home.name].pts += 3;
        else if (m.away_goals > m.home_goals) stats[m.away.name].pts += 3;
        else { stats[m.home.name].pts += 1; stats[m.away.name].pts += 1; }
      });

      const ordenado = Object.entries(stats).sort((a: any, b: any) => b[1].pts - a[1].pts);
      setTabla(ordenado);
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-gray-900">Tabla de Posiciones</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-center text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Equipo</th>
              <th className="p-4">PJ</th>
              <th className="p-4">GF</th>
              <th className="p-4">GC</th>
              <th className="p-4 text-blue-600 font-bold">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tabla.map(([nombre, s]: any) => (
              <tr key={nombre}>
                <td className="p-4 text-left font-bold">{nombre}</td>
                <td className="p-4">{s.pj}</td>
                <td className="p-4 text-green-600">{s.gf}</td>
                <td className="p-4 text-red-600">{s.gc}</td>
                <td className="p-4 text-blue-600 font-black text-lg">{s.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
