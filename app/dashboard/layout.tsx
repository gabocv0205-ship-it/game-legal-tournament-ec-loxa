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
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
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
  crown: "M2 4h20v2H2z M12 8l-3 5-5-3 1 8h14l1-8-5 3z"
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { stats, disciplinaryAlerts, tournamentId, refetch } = useTournamentData();
  
  // ==========================================
  // CEREBRO SAAS (Control de Perfil y Deudas)
  // ==========================================
  const [perfilUsuario, setPerfilUsuario] = useState<any>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  
  // NUEVO: Estado para saber qué torneo estamos administrando visualmente
  const [nombreTorneoActivo, setNombreTorneoActivo] = useState<string>("Cargando...");

  useEffect(() => {
    async function verificarIdentidad() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) setPerfilUsuario(profile);
      setLoadingPerfil(false);
    }
    verificarIdentidad();
  }, [router]);

  useEffect(() => {
    const isTournamentHub = pathname === "/dashboard/torneos";
    const isCorporateArea = pathname.startsWith("/superadmin");
    if (!isTournamentHub && !isCorporateArea) return;
    localStorage.removeItem("activeTournamentId");
    localStorage.removeItem("activeTournamentName");
    setNombreTorneoActivo("Seleccione un torneo");
    window.dispatchEvent(new Event("tournamentChanged"));
    refetch();
  }, [pathname, refetch]);

  // NUEVO: Función para leer el Torneo Activo y mostrar su nombre
  useEffect(() => {
    const fetchTorneoNombre = async () => {
      const activeId = localStorage.getItem('activeTournamentId');
      if (activeId) {
        const { data } = await supabase.from('tournaments').select('name').eq('id', activeId).single();
        if (data) setNombreTorneoActivo(data.name);
      } else {
        setNombreTorneoActivo("Seleccione un torneo");
      }
    };

    fetchTorneoNombre();
    // Escuchar si cambiamos de torneo desde la página principal
    window.addEventListener('tournamentChanged', fetchTorneoNombre);
    return () => window.removeEventListener('tournamentChanged', fetchTorneoNombre);
  }, []);

  if (loadingPerfil) {
    return (
      <div className="flex h-screen w-full bg-[#0a0a0a] items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
    { href: "/dashboard/roles", label: "Roles y Permisos", icon: Icons.user },
    { href: "/dashboard/auditoria", label: "Auditoría", icon: Icons.eye },
  ];

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
    <div className="game-light flex h-screen w-full bg-[#F7F4EC] overflow-hidden font-sans">
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white text-[#111827] flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} border-r border-[#E6DFC8]`}>
        <div className="p-6 border-b border-[#E6DFC8] flex items-center gap-3 relative overflow-hidden">
          {perfilUsuario?.role === 'superadmin' && <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4A017]/20 blur-xl"></div>}
          
          <div className="w-10 h-10 border-2 border-[#D4A017] rounded-full flex items-center justify-center text-[#D4A017] font-black text-xl shadow-[0_0_15px_rgba(212,160,23,0.22)] bg-[#FFFBEB]">
            {perfilUsuario?.role === 'superadmin' ? '👑' : 'C'}
          </div>
          <div className="relative z-10">
            <p className="font-black text-sm tracking-widest text-[#111827]">GAME-LEGAL</p>
            <p className="text-xs text-[#D4A017] font-bold uppercase tracking-widest">
              {perfilUsuario?.role === 'superadmin' ? 'SuperAdmin' : 'Pro Admin'}
            </p>
          </div>
        </div>
        
        <div className="px-4 pt-4 space-y-2">
          {tournamentId && !pathname.startsWith('/superadmin') && stats.suspended > 0 && (
            <div className="bg-[#D4A017]/20 border border-[#D4A017]/50 text-[#F5C842] px-3 py-2 rounded-lg text-xs font-bold">
              <div className="flex items-center gap-2"><Icon path={Icons.alert} size={14} /> <span>Fecha {stats.nextMatchday}: {stats.suspended} suspendido(s)</span></div>
              <p className="text-[9px] mt-1 text-yellow-100">{disciplinaryAlerts.suspended.map((item: any) => `${item.name} (${item.team})`).join(", ")}</p>
            </div>
          )}
          {tournamentId && !pathname.startsWith('/superadmin') && disciplinaryAlerts.eligibleAgain.length > 0 && (
            <div className="bg-green-900/30 border border-green-500/50 text-green-400 px-3 py-2 rounded-lg text-xs font-bold">
              <div>Fecha {stats.nextMatchday}: ya puede(n) jugar</div>
              <p className="text-[9px] mt-1 text-green-200">{disciplinaryAlerts.eligibleAgain.map((item: any) => `${item.name} (${item.team})`).join(", ")}</p>
            </div>
          )}
          {tournamentId && !pathname.startsWith('/superadmin') && stats.debts > 0 && (
            <div className="flex items-center gap-2 bg-red-900/40 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg text-xs font-bold">
              <Icon path={Icons.alert} size={14} /> <span>{stats.debts} equipo(s) con deudas</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto">
          {MENU.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${pathname === item.href ? "bg-[#D4A017] text-black shadow-[0_4px_20px_rgba(212,160,23,0.28)]" : "text-[#64748B] hover:bg-[#FFF7DB] hover:text-[#111827]"}`}>
              <Icon path={item.icon} size={18} /> {item.label}
            </Link>
          ))}
          
          {perfilUsuario?.role === 'superadmin' && (
            <div className="mt-4 pt-4 border-t border-[#2E2E2E] space-y-2">
              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest px-4 mb-2">Control Corporativo</p>
              
              <Link href="/superadmin/clientes" onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${pathname.includes("/superadmin/clientes") ? "bg-gradient-to-r from-red-600 to-red-900 text-white shadow-lg" : "bg-[#1a0a0a] text-red-500 border border-red-900/50 hover:bg-red-900/40"}`}>
                <Icon path={Icons.users} size={16} /> Bóveda Clientes
              </Link>
              
              <Link href="/superadmin/finanzas" onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${pathname.includes("/superadmin/finanzas") ? "bg-[#D4A017] text-black shadow-lg" : "bg-[#1a140a] text-[#D4A017] border border-[#D4A017]/50 hover:bg-[#D4A017]/20"}`}>
                <Icon path={Icons.dollar} size={16} /> Tesorería SaaS
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-[#E6DFC8]">
          {perfilUsuario?.role === 'organizer' && (
            <a href="https://wa.me/593960553548" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-sm text-white font-black uppercase tracking-wider transition-all mb-3 shadow-sm">
              Soporte WhatsApp
            </a>
          )}
          <Link href="/dashboard/configuracion" onClick={() => setSidebarOpen(false)} className={`w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#D4A017] rounded-lg text-sm font-bold transition-all mb-3 ${pathname === "/dashboard/configuracion" ? "bg-[#D4A017] text-black" : "text-[#D4A017] hover:bg-[#D4A017] hover:text-black"}`}>
            <Icon path={Icons.chart} size={16}/> Configurar Torneo
          </Link>
          <Link href="/" target="_blank" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-[#FFF7DB] rounded-lg text-sm text-[#111827] font-bold transition-all border border-[#E6DFC8]">
             <Icon path={Icons.eye} size={16}/> Ver App Pública
          </Link>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#F7F4EC] relative z-10 text-[#111827]">
        
        {perfilUsuario?.saas_status === 'pending_payment' && perfilUsuario?.role !== 'superadmin' && (
          <div className="bg-gradient-to-r from-red-900 via-red-600 to-red-900 text-white px-6 py-3 flex items-center justify-between shadow-[0_10px_30px_rgba(220,38,38,0.3)] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Icon path={Icons.alert} size={20} className="animate-pulse" />
              <span className="font-bold text-sm tracking-wide">AVISO DE SISTEMA: Tienes pagos pendientes por el uso de la plataforma SaaS.</span>
            </div>
            <button className="bg-black/30 hover:bg-black/50 px-4 py-1 rounded text-xs font-black uppercase tracking-widest transition-colors border border-white/20">Regularizar ahora</button>
          </div>
        )}

        <header className="bg-white border-b border-[#E6DFC8] px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-[#FFF7DB] text-[#111827] rounded-xl hover:bg-[#FDE68A]"><Icon path={Icons.bars} size={20}/></button>
          
          {/* NUEVO: Mostrar claramente el torneo que estamos administrando */}
          <div className="flex-1 flex flex-col">
            <h1 className="font-black text-[#111827] text-lg truncate">
               {perfilUsuario?.role === 'superadmin' ? 'Torre de Control Máxima' : 'Panel de Administración'}
            </h1>
            <p className="text-xs text-[#D4A017] uppercase tracking-widest font-bold flex items-center gap-2 mt-1">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Gestionando: {nombreTorneoActivo}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-[#111827] uppercase">{perfilUsuario?.full_name || 'Organizador'}</p>
              <p className="text-[10px] text-green-500 tracking-widest uppercase font-bold">● Conectado</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#D4A017] to-yellow-300 rounded-full flex items-center justify-center text-black text-sm font-black shadow">GL</div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8 relative">
          
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
