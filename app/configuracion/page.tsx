"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function ConfiguracionPage() {
  const [normativaActiva, setNormativaActiva] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Ajustes del Sistema</h1>
            <p className="text-slate-500 font-medium text-sm">Reglamento legal aplicable al campeonato.</p>
          </div>
          <Link href="/dashboard" className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-slate-50 transition-colors">
            Volver al Panel
          </Link>
        </header>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="text-4xl mb-4 text-center">⚖️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Reglamento y Sanciones</h2>
          
          {!normativaActiva ? (
            <div className="text-center">
              <p className="text-slate-500 mb-6 text-sm">No existen parámetros disciplinarios redactados.</p>
              <button onClick={() => setNormativaActiva(true)} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-colors text-sm">
                Activar Normativa Disciplinaria Base
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea 
                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                defaultValue="Art 1. Tarjeta Amarilla: Multa de $1.50 USD.&#10;Art 2. Tarjeta Roja (Doble Amarilla): 1 Partido de suspensión + Multa de $3.00 USD.&#10;Art 3. Roja Directa: Informe arbitral determina sanción."
              />
              <button className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors text-sm">
                Guardar Reformas Legales
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
