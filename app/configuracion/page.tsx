"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, ArrowLeft, Save } from 'lucide-react';

export default function ConfiguracionPage() {
  const [reglamento, setReglamento] = useState(
    "Art 1. Inscripción por club fijada en $200.00 USD.\nArt 2. Acumulación de 3 tarjetas amarillas conlleva 1 fecha automática de suspensión.\nArt 3. Expulsión directa por tarjeta roja genera multa administrativa de $5.00 USD."
  );

  const guardarConfiguracion = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Parámetros del reglamento legal actualizados correctamente.");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Ajustes del Sistema</h1>
              <p className="text-slate-500 text-sm font-medium">Bases del campeonato y reglamento legal aplicable.</p>
            </div>
          </div>
        </header>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><Settings size={16} /> Código de Disciplina y Reglamento</h2>
          <form onSubmit={guardarConfiguracion} className="space-y-4">
            <textarea
              value={reglamento}
              onChange={(e) => setReglamento(e.target.value)}
              className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors">
              <Save size={14} /> Guardar Reformas del Torneo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
