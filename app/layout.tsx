import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from 'next/link';
import { Trophy, Users, Calendar, DollarSign, Settings } from 'lucide-react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GAME-LEGAL Tournament Pro",
  description: "Plataforma de gestión de torneos",
};

// Componente del botón del menú
function NavItem({ icon, text, href }: { icon: React.ReactNode, text: string, href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-blue-200 hover:bg-blue-900 hover:text-white">
      {icon}
      <span className="font-medium">{text}</span>
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-50 flex">
          {/* Menú Lateral Fijo Global */}
          <aside className="w-64 bg-blue-950 text-white flex flex-col h-screen fixed z-10">
            <div className="p-6">
              <h1 className="text-2xl font-black tracking-tighter">GAME-LEGAL</h1>
              <p className="text-blue-300 text-xs tracking-widest mt-1">TOURNAMENT PRO</p>
            </div>
            
            <nav className="flex-1 px-4 mt-6 space-y-2">
              <NavItem href="/" icon={<Trophy size={20} />} text="Mis Torneos" />
              <NavItem href="/equipos" icon={<Users size={20} />} text="Equipos y Jugadores" />
              <NavItem href="/calendario" icon={<Calendar size={20} />} text="Calendario" />
              <NavItem href="/finanzas" icon={<DollarSign size={20} />} text="Finanzas" />
            </nav>
            
            <div className="p-4 border-t border-blue-800">
              <NavItem href="/configuracion" icon={<Settings size={20} />} text="Configuración" />
            </div>
          </aside>

          {/* El contenido de cada sección cargará aquí adentro */}
          <main className="ml-64 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}