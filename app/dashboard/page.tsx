"use client";
import React from "react";
import { useTournamentData } from "@/hooks/useTournamentData";

const StatCard = ({ icon, label, value, sub }: any) => (
  <div className="bg-[#141414] border border-[#2E2E2E] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group hover:border-[#D4A017] transition-all duration-300">
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#D4A017]/5 rounded-full blur-2xl group-hover:bg-[#D4A017]/20 transition-all"></div>
    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-4xl font-black mt-2 text-white">{value}</p>
        <p className="text-xs text-[#D4A017] mt-2 font-bold">{sub}</p>
      </div>
      <div className="text-3xl bg-[#1C1C1C] p-3 rounded-xl border border-[#2E2E2E]">{icon}</div>
    </div>
  </div>
);

export default function DashboardInicio() {
  const { players, teams, matches, stats, loading } = useTournamentData();

  if (loading) return <div className="text-center p-10 text-[#D4A017] font-bold animate-pulse">Sincronizando con la base de datos...</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* BANNER PRINCIPAL DARK & GOLD */}
      <div className="bg-gradient-to-r from-[#141414] to-[#1c1c1c] border border-[#2E2E2E] rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4A017]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(212,160,23,0.8)]">🏆</span>
            <span className="text-xs font-bold text-[#D4A017] uppercase tracking-[0.3em] border border-[#D4A017]/30 px-3 py-1 rounded-full bg-[#D4A017]/10">
              Gestión Oficial
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 text-white tracking-tight">GAME-LEGAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4A017] to-yellow-200">2026</span></h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed">
            El centro de mando definitivo para tu torneo. Los datos presentados a continuación se extraen en tiempo real de la base de datos en la nube.
          </p>
        </div>
      </div>
      
      {/* TARJETAS DINÁMICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="🛡️" label="Clubes" value={teams.length} sub="Equipos Inscritos" />
        <StatCard icon="👥" label="Jugadores" value={players.length} sub="Identidades Verificadas" />
        <StatCard icon="📅" label="Partidos" value={matches.length} sub="Encuentros Generados" />
        <StatCard icon="⚠️" label="Sancionados" value={stats.suspended} sub="Jugadores Inhabilitados" />
      </div>

      {/* SECCIÓN DE PATROCINADORES OFICIALES */}
      <div className="pt-8 border-t border-[#2E2E2E]">
        <h3 className="text-center text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-6">Patrocinadores Oficiales del Torneo</h3>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Reemplaza estos textos o emojis por imágenes reales <img src="..." /> cuando las tengas */}
          <div className="flex items-center gap-2 text-xl font-black tracking-tighter text-white"><span className="text-[#D4A017]">⚡</span> ASTRO CLUB</div>
          <div className="flex items-center gap-2 text-xl font-black tracking-widest text-white"><span className="text-blue-500">⚕️</span> FARMACIAS SUR</div>
          <div className="flex items-center gap-2 text-xl font-black text-white italic">PUERTA DEL SOL</div>
          <div className="flex items-center gap-2 text-xl font-black text-white">⚖️ GAME-LEGAL STUDIO</div>
        </div>
      </div>
    </div>
  );
}
