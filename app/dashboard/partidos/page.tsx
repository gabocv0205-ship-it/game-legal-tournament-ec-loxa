"use client";
import React, { useState, useEffect } from "react";

export default function PartidosPage() {
  const [partidos, setPartidos] = useState<any[]>([]);

  useEffect(() => {
    const part = localStorage.getItem('gl_partidos');
    if (part) setPartidos(JSON.parse(part));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-gray-900">Calendario Oficial</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partidos.length === 0 ? (
          <p className="text-gray-400">Genera el fixture desde Configuración para ver los partidos aquí.</p>
        ) : (
          partidos.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <span className="text-xs font-bold text-gray-400 block mb-4">{new Date(p.fecha).toLocaleDateString()}</span>
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 font-bold text-gray-800 truncate">{p.local}</div>
                <div className="bg-gray-900 text-white font-black text-xl px-4 py-2 rounded-lg">
                  {p.gl} - {p.gv}
                </div>
                <div className="flex-1 font-bold text-gray-800 truncate">{p.visitante}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
