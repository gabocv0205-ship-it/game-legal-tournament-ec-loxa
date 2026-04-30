"use client"; // Esto le dice a Next.js que esta página tendrá botones interactivos
import React, { useState } from 'react';
import { Trophy, Users, DollarSign, Plus, X } from 'lucide-react';

export default function Dashboard() {
  // Aquí creamos el "interruptor" para abrir y cerrar la ventana de Nuevo Torneo
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Resumen General</h2>
          <p className="text-gray-500">Bienvenido al panel de control de tus campeonatos.</p>
        </div>
        {/* El botón ahora tiene una acción (onClick) */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg"
        >
          <Plus size={20} />
          Nuevo Torneo
        </button>
      </header>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Torneos Activos" value="2" icon={<Trophy className="text-blue-500" />} />
        <StatCard title="Total Equipos" value="32" icon={<Users className="text-green-500" />} />
        <StatCard title="Recaudación Pendiente" value="$450.00" icon={<DollarSign className="text-red-500" />} />
      </div>

      {/* Lista de Torneos Recientes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Torneos Recientes</h3>
        <div className="space-y-4">
          <TournamentRow name="Copa Game-Legal 2026" teams={16} status="En Curso" />
          <TournamentRow name="Torneo Relámpago Jr" teams={8} status="Pendiente" />
        </div>
      </div>

      {/* --- LA MAGIA: LA VENTANA EMERGENTE (MODAL) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Crear Nuevo Torneo</h3>
            <p className="text-gray-500 text-sm mb-6">Configura los datos iniciales del campeonato.</p>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Campeonato</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ej. Liga Sur 2026" />
              </div>
              <button 
                type="button" 
                onClick={() => alert("¡Pronto conectaremos esto a Supabase!")}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors mt-4"
              >
                Guardar y Continuar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Componentes Reutilizables ---
function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg">{icon}</div>
    </div>
  );
}

function TournamentRow({ name, teams, status }: { name: string, teams: number, status: string }) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-gray-800">{name}</p>
          <p className="text-sm text-gray-500">{teams} Equipos registrados</p>
        </div>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${status === 'En Curso' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {status}
      </span>
    </div>
  );
}