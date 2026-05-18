"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function CalendarioPage() {
  const [fixtureGenerado, setFixtureGenerado] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Calendario Automático</h1>
            <p className="text-slate-500 font-medium text-sm">Generación de fixtures y programación de fechas.</p>
          </div>
          <Link href="/dashboard" className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-slate-50 transition-colors">
            Volver al Panel
          </Link>
        </header>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sorteo de Fixture</h2>
          
          {!fixtureGenerado ? (
            <>
              <p className="text-slate-500 mb-6 text-sm">Sistema listo para la automatización de cruces de fase de grupos.</p>
              <button onClick={() => setFixtureGenerado(true)} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-colors text-sm">
                Generar Fixture Automático
              </button>
            </>
          ) : (
            <div className="mt-6 p-6 bg-purple-50 border border-purple-200 rounded-2xl text-left">
              <h3 className="font-bold text-purple-900 mb-4">Jornada 1 - Confirmada</h3>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg border border-purple-100 flex justify-between font-medium text-sm text-gray-700">
                  <span>Equipo A</span> <span>vs</span> <span>Equipo B</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-purple-100 flex justify-between font-medium text-sm text-gray-700">
                  <span>Equipo C</span> <span>vs</span> <span>Equipo D</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
