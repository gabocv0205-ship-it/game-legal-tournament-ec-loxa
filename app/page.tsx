"use client";
import React from "react";
import Link from "next/link";
import { Trophy, Shield, Calendar, DollarSign, ChevronRight, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-200">
      {/* BARRA DE NAVEGACIÓN */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-xl shadow-md">🏆</div>
            <span className="font-black text-xl tracking-tighter text-gray-900">GAME-LEGAL</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold text-gray-500">
            <a href="#caracteristicas" className="hover:text-blue-600 transition">Características</a>
            <a href="#seguridad" className="hover:text-blue-600 transition">Seguridad</a>
            <a href="#precios" className="hover:text-blue-600 transition">Planes</a>
          </div>
          <div className="flex gap-3">
            {/* Este botón llevará a tu pantalla de Login que ya creamos */}
            <Link href="/login" className="px-5 py-2.5 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* SECCIÓN HERO (Principal) */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto text-center mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-6">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Lanzamiento Oficial 2026 — Ecuador
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-tight mb-6">
            Lleva tu campeonato al <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">siguiente nivel.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            La primera plataforma SaaS en Ecuador diseñada exclusivamente para organizadores de fútbol. Controla equipos, finanzas, sanciones y calendarios desde un entorno seguro y automatizado.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1">
              Comenzar a Administrar <ChevronRight size={20} />
            </Link>
            <button className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-800 font-black rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center gap-2 transition">
              <Smartphone size={20} className="text-gray-400" /> Ver Demo en Vivo
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN CARACTERÍSTICAS */}
      <section id="caracteristicas" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Todo lo que necesitas, en un solo lugar.</h2>
            <p className="text-gray-500">Diseñado por expertos legales y deportivos para evitar fraudes y problemas organizativos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="text-emerald-500" size={32} />}
              title="Sistema Anti-Fraude"
              desc="Validación de cédulas en tiempo real. Un jugador no podrá registrarse en dos equipos del mismo torneo."
            />
            <FeatureCard 
              icon={<DollarSign className="text-blue-500" size={32} />}
              title="Control Financiero USD"
              desc="Seguimiento de inscripciones, multas y pagos parciales. Bloquea a equipos deudores automáticamente."
            />
            <FeatureCard 
              icon={<Calendar className="text-purple-500" size={32} />}
              title="Generador de Fixture"
              desc="Sorteos automáticos, fase de grupos o eliminación directa. Exportación de planillas de partido a PDF."
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0a1628] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm shadow-md">🏆</div>
            <span className="font-black text-lg tracking-tighter">GAME-LEGAL</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">© 2026 GAME-LEGAL Tournament Pro. Loja, Ecuador.</p>
        </div>
      </footer>
    </div>
  );
}

// Componente para las tarjetas de características
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-black text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm font-medium">{desc}</p>
    </div>
  );
}