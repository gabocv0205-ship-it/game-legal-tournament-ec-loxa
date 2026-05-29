"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTournamentData } from "./useTournamentData";

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
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  crown: "M2 4h20v2H2z M12 8l-3 5-5-3 1 8h14l1-8-5 3z" // Ícono de Corona para el Dueño
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { stats } = useTournamentData();
  
  // ==========================================
  // CEREBRO SAAS (Control de Perfil y Deudas)
  // ==========================================
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  useEffect(() => {
    async function verificarIdentidad() {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Si nadie ha iniciado sesión, expulsar a la página de login
      if (!session) {
        router.push('/');
        return;
      }

      // Buscar si el usuario es cliente o superadmin y su estado de pagos
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      
      if (profile) {
        setPerfilUsuario(profile);
      }
      setLoadingPerfil(false);
    }
    
    verificarIdentidad();
  }, [router]);

  // Si está cargando la identidad, mostrar un spinner elegante
  if (loadingPerfil) {
    return (
      <div className="flex h-screen w-full bg-[#0a0a0a] items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ==========================================
  // GENERACIÓN DEL MENÚ INTELIGENTE
  // ==========================================
  const MENU = [
    { href: "/dashboard/perfil", label: "Mi Perfil", icon: Icons.user },
    { href: "/dashboard/torneos", label: "Mis Torneos", icon: Icons.crown },
    { href: "/dashboard", label: "Inicio", icon: Icons.home },
    { href: "/dashboard/equipos", label: "Equipos", icon: Icons.shield },
    { href: "/dashboard/jugadores", label: "Jugadores", icon: Icons.users },
    { href: "/dashboard/sorteo", label: "Fase de Grupos", icon: Icons.grid },
    { href: "/dashboard/partidos", label: "Partidos", icon: Icons.calendar },
    { href: "/dashboard/finanzas", label: "Finanzas", icon: Icons.dollar },
    { href: "/dashboard/estadisticas", label: "Estadísticas", icon: Icons.chart },
  ];

  // ==========================================
  // CONTROL DE SUSPENSIÓN (Pantalla Bloqueada)
  // ==========================================
  if (perfilUsuario?.saas_status === 'suspended' && perfilUsuario?.role !== 'superadmin') {
    return (
      <div className="flex flex-col h-screen w-full bg-[#0a0a0a] items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-6 text-red-500 bg-red-900/20 p-4 rounded-full border-2 border-red-500 animate-pulse flex items-center justify-center">
          <Icon path={Icons.alert} size={48} />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-4">Servicio Suspendido</h1>
        <p className="text-gray-400 max-w-md text-lg mb-8">El acceso a su panel de administración ha sido bloqueado por falta de pago. Por favor, regularice su suscripción para recuperar el control de su torneo.</p>
        <button className="bg-[#D4A017] text-black font-black px-8 py-3 rounded uppercase tracking-widest hover:bg-yellow-500 transition-all">
          Contactar a Soporte
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden font-sans">
      
      {/* MENÚ LATERAL (SIDEBAR) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#141414] text-white flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} border-r border-[#2E2E2E]`}>
        <div className="p-6 border-b border-[#2E2E2E] flex items-center gap-3 relative overflow-hidden">
          {/* Brillo especial si eres Súper Admin */}
          {perfilUsuario?.role === 'superadmin' && <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4A017]/20 blur-xl"></div>}
          
          <div className="w-10 h-10 border-2 border-[#D4A017] rounded-full flex items-center justify-center text-[#D4A017] font-black text-xl shadow-[0_0_15px_rgba(212,160,23,0.3)] bg-[#1C1C1C]">
            {perfilUsuario?.role === 'superadmin' ? '👑' : 'C'}
          </div>
          <div className="relative z-10">
            <p className="font-black text-sm tracking-widest text-white">GAME-LEGAL</p>
            <p className="text-xs text-[#D4A017] font-bold uppercase tracking-widest">
              {perfilUsuario?.role === 'superadmin' ? 'SuperAdmin' : 'Pro Admin'}
            </p>
          </div>
        </div>
        
        <div className="px-4 pt-4 space-y-2">
          {stats.suspended > 0 && (
            <div className="flex items-center gap-2 bg-[#D4A017]/20 border border-[#D4A017]/50 text-[#F5C842] px-3 py-2 rounded-lg text-xs font-bold animate-pulse">
              <Icon path={Icons.alert} size={14} /> <span>{stats.suspended} jugador(es) suspendido(s)</span>
            </div>
          )}
          {stats.debts > 0 && (
            <div className="flex items-center gap-2 bg-red-900/40 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-xs font-bold">
              <Icon path={Icons.alert} size={14} /> <span>{stats.debts} equipo(s) con deudas</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto">
          {MENU.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${pathname === item.href ? "bg-[#D4A017] text-black shadow-[0_4px_20px_rgba(212,160,23,0.4)]" : "text-[#8A8A8A] hover:bg-[#1C1C1C] hover:text-white"}`}>
              <Icon path={item.icon} size={18} /> {item.label}
            </Link>
          ))}
          
          {/* BOTÓN SECRETO SOLO PARA TI (EL DUEÑO) */}
          {perfilUsuario?.role === 'superadmin' && (
             <Link href="/superadmin/clientes" onClick={() => setSidebarOpen(false)}
             className={`w-full flex items-center gap-3 px-4 py-3 mt-4 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${pathname.includes("/superadmin") ? "bg-gradient-to-r from-red-600 to-red-900 text-white shadow-[0_4px_20px_rgba(220,38,38,0.4)]" : "bg-[#1a0a0a] text-red-500 border border-red-900/50 hover:bg-red-900/40"}`}>
             <Icon path={Icons.crown} size={18} /> Bóveda Admin
           </Link>
          )}
        </nav>

        <div className="p-4 border-t border-[#2E2E2E]">
          <Link href="/dashboard/configuracion" onClick={() => setSidebarOpen(false)} className={`w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#D4A017] rounded-lg text-sm font-bold transition-all mb-3 ${pathname === "/dashboard/configuracion" ? "bg-[#D4A017] text-black" : "text-[#D4A017] hover:bg-[#D4A017] hover:text-black"}`}>
            <Icon path={Icons.chart} size={16}/> Configurar Torneo
          </Link>
          <Link href="/" target="_blank" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1C1C1C] hover:bg-[#242424] rounded-lg text-sm text-white font-bold transition-all border border-[#2E2E2E]">
             <Icon path={Icons.eye} size={16}/> Ver App Pública
          </Link>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#0a0a0a] relative z-10 text-white">
        
        {/* BANNER INQUISIDOR DE DEUDAS (Si el cliente debe dinero) */}
        {perfilUsuario?.saas_status === 'pending_payment' && perfilUsuario?.role !== 'superadmin' && (
          <div className="bg-gradient-to-r from-red-900 via-red-600 to-red-900 text-white px-6 py-3 flex items-center justify-between shadow-[0_10px_30px_rgba(220,38,38,0.3)] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Icon path={Icons.alert} size={20} className="animate-pulse" />
              <span className="font-bold text-sm tracking-wide">AVISO DE SISTEMA: Tienes pagos pendientes por el uso de la plataforma SaaS.</span>
            </div>
            <button className="bg-black/30 hover:bg-black/50 px-4 py-1 rounded text-xs font-black uppercase tracking-widest transition-colors border border-white/20">Regularizar ahora</button>
          </div>
        )}

        <header className="bg-[#141414] border-b border-[#2E2E2E] px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-[#1C1C1C] text-gray-300 rounded-xl hover:bg-[#2A2A2A]"><Icon path={Icons.bars} size={20}/></button>
          <h1 className="font-black text-white text-lg flex-1 truncate">
             {perfilUsuario?.role === 'superadmin' ? 'Torre de Control Máxima' : 'Panel de Administración'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-white uppercase">{perfilUsuario?.full_name || 'Organizador'}</p>
              <p className="text-[10px] text-green-500 tracking-widest uppercase font-bold">● Conectado</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#D4A017] to-yellow-300 rounded-full flex items-center justify-center text-black text-sm font-black shadow">GL</div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8 relative">
          
          {/* Si eres SuperAdmin, mostrar un leve aviso visual de fondo en el área de trabajo */}
          {perfilUsuario?.role === 'superadmin' && (
            <div className="absolute top-4 right-8 pointer-events-none opacity-10">
              <h2 className="text-8xl font-black italic tracking-tighter">SÚPER ADMIN</h2>
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
