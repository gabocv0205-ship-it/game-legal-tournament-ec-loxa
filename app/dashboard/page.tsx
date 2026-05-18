import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  // Estos son torneos de prueba (Mock data)
  // Pronto los traeremos directamente desde tu base de datos Supabase
  const torneos = [
    { id: 1, nombre: "Copa Apertura 2026", estado: "En Juego", color: "bg-green-100 text-green-700" },
    { id: 2, nombre: "Liga Nocturna", estado: "Inscripciones", color: "bg-blue-100 text-blue-700" },
  ];

  return (
    <div className="p-8 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">Panel de Control</h1>
            <p className="text-gray-500 font-medium">Bienvenido, selecciona un torneo para comenzar.</p>
          </div>
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all">
            + Nuevo Torneo
          </button>
        </header>

        {/* SECCIÓN: SELECTOR DE TORNEOS */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
            🏆 Mis Torneos Activos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {torneos.map((torneo) => (
              <div key={torneo.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{torneo.nombre}</h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${torneo.color}`}>
                    {torneo.estado}
                  </span>
                </div>
                <button className="w-full py-2 bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-700 font-medium rounded-lg text-sm transition-colors">
                  Administrar
                </button>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-slate-200 mb-8" />
        
        {/* SECCIÓN: ACCESOS RÁPIDOS (Las 4 tarjetas) */}
        <h2 className="text-lg font-bold text-gray-700 mb-4">Herramientas Globales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/equipos" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 hover:border-blue-500 group">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">🛡️</div>
            <h2 className="text-lg font-bold text-gray-800">Equipos</h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">Plantillas y jugadores</p>
          </Link>

          <Link href="/finanzas" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 hover:border-emerald-500 group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">💰</div>
            <h2 className="text-lg font-bold text-gray-800">Finanzas</h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">Control de pagos</p>
          </Link>

          <Link href="/calendario" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 hover:border-purple-500 group">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">📅</div>
            <h2 className="text-lg font-bold text-gray-800">Calendario</h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">Fixture de partidos</p>
          </Link>

          <Link href="/configuracion" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 hover:border-orange-500 group">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-lg font-bold text-gray-800">Ajustes</h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">Reglas del torneo</p>
          </Link>
        </div>

      </div>
    </div>
  );
}
