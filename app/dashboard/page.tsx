import React from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="p-8 min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-10">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Panel de Control</h1>
          <p className="text-gray-500 font-medium">Bienvenido, Administrador de GAME-LEGAL.</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Tarjeta / Botón a Equipos */}
          <Link href="/equipos" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 hover:border-blue-500 group">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              🛡️
            </div>
            <h2 className="text-xl font-bold text-gray-800">Equipos</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">Gestionar plantillas y jugadores</p>
          </Link>

          {/* Tarjeta / Botón a Finanzas */}
          <Link href="/finanzas" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 hover:border-emerald-500 group">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              💰
            </div>
            <h2 className="text-xl font-bold text-gray-800">Finanzas</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">Control de pagos y multas</p>
          </Link>

          {/* Tarjeta / Botón a Calendario */}
          <Link href="/calendario" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 hover:border-purple-500 group">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              📅
            </div>
            <h2 className="text-xl font-bold text-gray-800">Calendario</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">Fixture y programación</p>
          </Link>

          {/* Tarjeta / Botón a Configuración */}
          <Link href="/configuracion" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 hover:border-orange-500 group">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              ⚙️
            </div>
            <h2 className="text-xl font-bold text-gray-800">Configuración</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">Ajustes del torneo</p>
          </Link>

        </div>
      </div>
    </div>
  );
}