"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function CalendarioPage() {
  const [generado, setGenerado] = useState(false);

  const goleadores = [
    { nombre: "Andrés Calva", equipo: "FC Barcelona SC", goles: 8 },
    { nombre: "Gabriel Vásquez", equipo: "Liga Nocturna Club", goles: 6 }
  ];

  const disciplina = [
    { nombre: "Luis Medina", equipo: "FC Barcelona SC", amarillas: 3, suspendido: true },
    { nombre: "Juan Encalada", equipo: "Astro Club", amarillas: 1, suspendido: false }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Calendario y Tabla de Rendimiento</h1>
              <p className="text-slate-500 text-sm font-medium">Sorteo automático de jornadas y auditoría de sanciones del torneo.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><Calendar size={16} /> Cronograma de Partidos</h2>
            {!generado ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 mb-4 font-medium">Las llaves se encuentran abiertas en base de datos.</p>
                <button onClick={() => setGenerado(true)} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors">
                  Generar Fixture Oficial
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-xs font-black text-purple-700 uppercase tracking-wider block mb-2">Fecha 1</span>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-800 px-2">
                    <span>FC Barcelona SC</span>
                    <span className="text-gray-400 font-medium">vs</span>
                    <span>Liga Nocturna</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><Trophy size={16} /> Tabla de Goleadores</h2>
            <div className="divide-y divide-slate-100">
              {goleadores.map((g, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5">
                  <div>
                    <div className="font-bold text-sm text-gray-900">{g.nombre}</div>
                    <div className="text-xs text-slate-500 font-medium">{g.equipo}</div>
                  </div>
                  <span className="text-sm font-black bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">{g.goles} Goles</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> Reporte Disciplinario Legal</h2>
            <div className="divide-y divide-slate-100">
              {disciplina.map((d, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5">
                  <div>
                    <div className="font-bold text-sm text-gray-900">{d.nombre}</div>
                    <div className="text-xs text-slate-500 font-medium">{d.equipo} (🟨 {d.amarillas})</div>
                  </div>
                  {d.suspendido ? (
                    <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded uppercase tracking-wider">Suspendido</span>
                  ) : (
                    <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded uppercase tracking-wider">Habilitado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
