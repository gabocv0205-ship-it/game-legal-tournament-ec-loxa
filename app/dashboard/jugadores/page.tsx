"use client";
import React, { useState, useEffect } from "react";

export default function JugadoresPage() {
  const [jugadores, setJugadores] = useState<any[]>([]);

  useEffect(() => {
    const jug = localStorage.getItem('gl_jugadores');
    if (jug) setJugadores(JSON.parse(jug));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-gray-900">Plantillas y Sanciones</h2>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-4">Cédula</th>
              <th className="p-4">Jugador</th>
              <th className="p-4 text-center">Amarillas</th>
              <th className="p-4 text-center">Rojas</th>
              <th className="p-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jugadores.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sin jugadores registrados</td></tr>
            ) : (
              jugadores.map(j => (
                <tr key={j.id} className={j.suspendido ? 'bg-red-50' : ''}>
                  <td className="p-4 font-mono text-blue-600">{j.cedula}</td>
                  <td className="p-4 font-bold">{j.nombre}</td>
                  <td className="p-4 text-center text-lg">{j.amarillas} 🟨</td>
                  <td className="p-4 text-center text-lg">{j.rojas} 🟥</td>
                  <td className="p-4 text-center">
                    {j.suspendido ? (
                      <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">Suspendido</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Habilitado</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
