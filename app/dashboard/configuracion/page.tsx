"use client";
import React, { useState, useEffect } from "react";

export default function ConfiguracionPage() {
  const [config, setConfig] = useState({
    nombre: "Copa GAME-LEGAL",
    inscripcion: 150,
    premio: 2000,
    formato: "liguilla",
  });

  const formatos = [
    { id: "liguilla", nombre: "Liguilla Simple", icono: "📊", desc: "Todos contra todos. El que hace más puntos es el campeón." },
    { id: "champions", nombre: "Estilo Champions", icono: "🏆", desc: "Grupos de 4 equipos. Los 2 mejores avanzan a 8vos de final." },
    { id: "mundial", nombre: "Estilo Mundial", icono: "🌍", desc: "Fase de grupos rápida, cuartos, semi y gran final." },
    { id: "sudamericana", nombre: "Mata-Mata (Sudamericana)", icono: "⚔️", desc: "Eliminación directa de ida y vuelta desde el inicio." }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-black text-gray-900">Configuración del Torneo</h2>
        <p className="text-gray-500">Define las reglas, premios y el formato de la competición.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* FORMATO DEL TORNEO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4 text-gray-800">1. Sistema de Juego</h3>
          <div className="space-y-3">
            {formatos.map(f => (
              <div 
                key={f.id} 
                onClick={() => setConfig({...config, formato: f.id})}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex gap-4 items-center ${config.formato === f.id ? 'border-[#D4A017] bg-[#D4A017]/10' : 'border-gray-100 hover:border-gray-300'}`}
              >
                <div className="text-3xl">{f.icono}</div>
                <div>
                  <h4 className="font-bold text-gray-900">{f.nombre}</h4>
                  <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PARÁMETROS ECONÓMICOS Y PREMIOS */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4 text-gray-800">2. Parámetros Económicos</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Torneo</label>
                <input type="text" value={config.nombre} onChange={e=>setConfig({...config, nombre: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl mt-1 focus:border-[#D4A017] outline-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Inscripción ($)</label>
                  <input type="number" value={config.inscripcion} onChange={e=>setConfig({...config, inscripcion: Number(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl mt-1 focus:border-[#D4A017] outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Premio Mayor ($)</label>
                  <input type="number" value={config.premio} onChange={e=>setConfig({...config, premio: Number(e.target.value)})} className="w-full p-3 border border-gray-200 rounded-xl mt-1 focus:border-[#D4A017] outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-900 to-black p-6 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold text-lg mb-2 text-[#D4A017]">3. Generación Automática</h3>
            <p className="text-sm text-gray-300 mb-4">El sistema emparejará a los equipos inscritos utilizando el formato <b>{formatos.find(f => f.id === config.formato)?.nombre}</b>.</p>
            <button className="w-full py-3 bg-[#D4A017] text-black font-black rounded-xl hover:bg-yellow-400 transition-all shadow-[0_0_15px_rgba(212,160,23,0.4)]">
              GUARDAR Y GENERAR FIXTURE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
