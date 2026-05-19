"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FinanzasPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const { data: tourney } = await supabase.from("tournaments").select("id, registration_fee").order("created_at", { ascending: false }).limit(1).single();
    if (tourney) {
      const { data: teams } = await supabase
        .from("teams")
        .select(`*, payments(amount)`)
        .eq("tournament_id", tourney.id);
      
      const equiposCalculados = teams?.map(t => ({
        ...t,
        pagado: t.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
        deuda: Number(tourney.registration_fee) - t.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      }));
      setEquipos(equiposCalculados || []);
    }
  };

  useEffect(() => { loadData(); }, []);

  const registrarPago = async (teamId: string) => {
    const amount = prompt("Ingrese el valor del abono:");
    if (!amount) return;
    setLoading(true);
    await supabase.from("payments").insert([{ team_id: teamId, amount: Number(amount), payment_type: 'abono' }]);
    loadData();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-gray-900">Control Financiero</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4">Equipo</th>
              <th className="p-4 text-center">Pagado</th>
              <th className="p-4 text-center">Saldo Pendiente</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {equipos.map(eq => (
              <tr key={eq.id}>
                <td className="p-4 font-bold">{eq.name}</td>
                <td className="p-4 text-center text-green-600 font-mono font-bold">${eq.pagado}</td>
                <td className="p-4 text-center text-red-600 font-mono font-bold">${eq.deuda > 0 ? eq.deuda : 0}</td>
                <td className="p-4 text-center">
                  <button onClick={() => registrarPago(eq.id)} className="px-3 py-1 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all">
                    Registrar Abono
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
