import React from 'react';
import Link from 'next/link';
import { Trophy, Users, Calendar, DollarSign, Settings, Plus } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar / Menú Lateral */}
      <aside className="w-64 bg-blue-950 text-white flex flex-col h-screen fixed">
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-tighter">GAME-LEGAL</h1>
          <p className="text-blue-300 text-xs tracking-widest mt-1">TOURNAMENT PRO</p>
        </div>
        
        <nav className="flex-1 px-4 mt-6 space-y-2">
          {/* Aquí ya están los enlaces (href) configurados */}
          <NavItem href="/" icon={<Trophy size={20} />} text="Mis Torneos" active />
          <NavItem href="/equipos" icon={<Users size={20} />} text="Equipos y Jugadores" />
          <NavItem href="/calendario" icon={<Calendar size={20} />} text="Calendario" />
          <NavItem href="/finanzas" icon={<DollarSign size={20} />} text="Finanzas" />
        </nav>
        
        <div className="p-4 border-t border-blue-800">
          <NavItem href="/configuracion" icon={<Settings size={20} />} text="Configuración" />
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="ml-64 flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Resumen General</h2>
            <p className="text-gray-500">Bienvenido al panel de control de tus campeonatos.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg">
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
      </main>
    </div>
  );
}

// --- Componentes Reutilizables ---

// El componente NavItem ahora utiliza <Link> de Next.js
function NavItem({ icon, text, href, active = false }: { icon: React.ReactNode, text: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-900 hover:text-white'}`}>
      {icon}
      <span className="font-medium">{text}</span>
    </Link>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg">
        {icon}
      </div>
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