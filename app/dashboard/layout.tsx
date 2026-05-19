"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ============================================================
// ICONS (Inline SVG)
// ============================================================
const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);
const Icons = {
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  dollar: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  chart: "M3 3v18h18M18 17V9M13 17V5M8 17v-3",
  bars: "M3 12h18M3 6h18M3 18h18",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lista de navegación basada en tu requerimiento exacto
  const MENU = [
    { href: "/dashboard", label: "Inicio", icon: Icons.home },
    { href: "/dashboard/equipos", label: "Equipos", icon: Icons.users },
    { href: "/dashboard/jugadores", label: "Jugadores", icon: Icons.shield },
    { href: "/dashboard/partidos", label: "Partidos", icon: Icons.calendar },
    { href: "/dashboard/finanzas", label: "Finanzas", icon: Icons.dollar },
    { href: "/dashboard/estadisticas", label: "Estadísticas", icon: Icons.chart },
  ];

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      
      {/* MENÚ LATERAL PREMIUM (DARK & GOLD) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#141414] text-white flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} border-r border-[#2E2E2E]`}>
        <div className="p-6 border-b border-[#2E2E2E] flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#D4A017] rounded-full flex items-center justify-center text-[#D4A017] font-black text-xl shadow-[0_0_15px_rgba(212,160,23,0.3)] bg-[#1C1C1C]">
            C
          </div>
          <div>
            <p className="font-black text-sm tracking-widest text-white">GAME-LEGAL</p>
            <p className="text-xs text-[#D4A017] font-bold uppercase tracking-widest">Pro Admin</p>
          </div>
        </div>
        
        {/* ZONA DE ALERTAS (Requerimiento) */}
        <div className="px-4 pt-4 space-y-2">
          <div className="flex items-center gap-2 bg-[#D4A017]/20 border border-[#D4A017]/50 text-[#F5C842] px-3 py-2 rounded-lg text-xs font-bold">
            <Icon path={Icons.alert} size={14} />
            <span>1 jugador(es) suspendido(s)</span>
          </div>
          <div className="flex items-center gap-2 bg-red-900/40 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-xs font-bold">
            <Icon path={Icons.alert} size={14} />
            <span>1 equipo(s) con pagos pendientes</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto">
          {MENU.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                  isActive 
                  ? "bg-[#D4A017] text-black shadow-[0_4px_20px_rgba(212,160,23,0.4)]" 
                  : "text-[#8A8A8A] hover:bg-[#1C1C1C] hover:text-white"
                }`}>
                <Icon path={item.icon} size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#2E2E2E]">
          <Link href="/dashboard/configuracion" onClick={() => setSidebarOpen(false)} className={`w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#D4A017] rounded-lg text-sm font-bold transition-all mb-3 ${pathname === "/dashboard/configuracion" ? "bg-[#D4A017] text-black" : "text-[#D4A017] hover:bg-[#D4A017] hover:text-black"}`}>
            <Icon path={Icons.chart} size={16}/> Configurar Torneo
          </Link>
          <Link href="/invitados" target="_blank" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1C1C1C] hover:bg-[#242424] rounded-lg text-sm text-white font-bold transition-all border border-[#2E2E2E]">
             <Icon path={Icons.eye} size={16}/> Ver App Pública
          </Link>
        </div>
      </aside>

      {/* OVERLAY PARA MÓVILES */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* CONTENIDO PRINCIPAL (Aquí se inyectan las páginas de tus otras carpetas) */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-gray-50 relative z-10">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
            <Icon path={Icons.bars} size={20}/>
          </button>
          <h1 className="font-black text-gray-900 text-lg flex-1 truncate">Panel de Administración</h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-gray-900">Organizador</p>
              <p className="text-xs text-gray-400">Torneo Activo</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#D4A017] to-yellow-300 rounded-full flex items-center justify-center text-black text-sm font-black border-2 border-white shadow">
              GL
            </div>
          </div>
        </header>

        {/* Renderizado dinámico de las páginas */}
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}
