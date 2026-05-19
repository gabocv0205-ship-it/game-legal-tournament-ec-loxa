"use client";
import React, { useEffect, useState } from 'react';
import { Trophy, AlertTriangle, FileText, Eye } from 'lucide-react';

export default function PortalInvitados() {
  const [visitas, setVisitas] = useState(0);

  useEffect(() => {
    let conteo = parseInt(localStorage.getItem('visitas_torneo') || "1420");
    conteo += 1;
    localStorage.setItem('visitas_torneo', conteo.toString());
    setVisitas(conteo);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Trophy size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">GAME-LEGAL</h1>
          <p className="text-blue-400 font-bold tracking-widest mt-2 uppercase text-sm">Portal Oficial de Competición</p>
          
          <div className="mt-6 inline-flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
            <Eye size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">{visitas.toLocaleString()} Espectadores y Seguidores</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText size={20} className="text-blue-400" /> Reglamento Oficial 2026</h2>
            <div className="text-sm text-slate-300 space-y-3 font-medium">
              <p>📍 <strong>Art 1.</strong> La cédula de identidad es documento OBLIGATORIO para jugar.</p>
              <p>📍 <strong>Art 2.</strong> Jugador inscrito en 2 equipos será expulsado del torneo.</p>
              <p>📍 <strong>Art 3.</strong> Acumulación de 3 amarillas: 1 partido de suspensión.</p>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-400" /> Top Goleadores</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-xl">
                <div><div className="font-bold text-white">Andrés Calva</div><div className="text-xs text-slate-400">FC Barcelona SC</div></div>
                <div className="font-black text-yellow-400 text-lg">8 ⚽</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-red-900/20 p-6 rounded-3xl border border-red-900/50 shadow-xl">
            <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><AlertTriangle size={20} /> Reporte de Sancionados</h2>
            <div className="flex justify-between items-center p-4 bg-slate-800 rounded-xl border border-slate-700">
              <div><div className="font-bold text-white">Luis Medina <span className="text-xs text-slate-400 ml-2">(FC Barcelona SC)</span></div></div>
              <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded uppercase">Suspendido (3 Amarillas)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
