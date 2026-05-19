"use client";
import React from "react";

const StatCard = ({ icon, label, value, sub, color = "blue" }: any) => {
  const colors: any = { blue: "from-blue-500 to-blue-700", green: "from-emerald-500 to-emerald-700", orange: "from-orange-400 to-orange-600", purple: "from-violet-500 to-violet-700", red: "from-rose-500 to-rose-700" };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex justify-between items-start">
        <div><p className="text-sm opacity-80 font-medium">{label}</p><p className="text-3xl font-black mt-1">{value}</p>{sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}</div>
        <div className="bg-white/20 p-2 rounded-xl text-2xl">{icon}</div>
      </div>
    </div>
  );
};

export default function DashboardInicio() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a3a6b] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Panel Oficial</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-2">Copa GAME-LEGAL</h1>
          <p className="text-blue-200 text-sm max-w-md">Gestiona inscripciones, genera fixtures y controla estadísticas.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Equipos" value="8" sub="Inscritos" color="blue" />
        <StatCard icon="🛡️" label="Jugadores" value="120" sub="Verificados" color="purple" />
        <StatCard icon="📅" label="Partidos" value="12" sub="Programados" color="green" />
        <StatCard icon="⚠️" label="Sancionados" value="1" sub="Inhabilitados" color="red" />
      </div>
    </div>
  );
}
