import React from 'react';
import Link from 'next/link';

export default function ConfiguracionPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Ajustes del Sistema</h1>
            <p className="text-slate-500 font-medium text-sm">Parámetros, reglas y configuración legal del campeonato.</p>
          </div>
          <Link href="/dashboard" className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-slate-50 transition-colors">
            Volver al Panel
          </Link>
        </header>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">⚖️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reglamento y Sanciones</h2>
          <p className="text-slate-500 mb-6 text-sm">Configura las normativas aplicables a los equipos y jugadores.</p>
          <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md transition-colors text-sm">
            Redactar Normativa
          </button>
        </div>
      </div>
    </div>
  );
}
