"use client";
import React, { useState, useEffect } from "react";

export default function FinanzasPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [config, setConfig] = useState({ inscripcion: 150 });

  useEffect(() => {
    const eq = localStorage.getItem('gl_equipos');
    if (eq) setEquipos(JSON.parse(eq));
    const conf = localStorage.getItem('gl_config');
    if (conf) setConfig(JSON.parse(conf));
  }, []);

  // Cálculos financieros
  const totalEsperado = equipos.length * config.inscripcion;
  const totalRecaudado = equipos.reduce((sum, eq) => sum + (eq.abono || 0), 0);
  const totalPorCobrar = totalEsperado - totalRecaudado;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-gray-900">Control Financiero</h2>
      
      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Total Esperado</p>
          <p className="text-3xl font-black text-gray-900 mt-2">${totalEsperado}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Recaudado (Abonos)</p>
          <p className="text-3xl font-black text-green-600 mt-2">${totalRecaudado}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Por Cobrar</p>
          <p className="text-3xl font-black text-red-600 mt-2">${totalPorCobrar}</p>
        </div>
      </div>

      {/* Detalle por Equipo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Estado de Cuenta por Equipo</h3>
          <span className="text-xs font-bold text-gray-500">Inscripción fijada: ${config.inscripcion}</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-gray-500 border-b border-gray-100">
            <tr>
              <th className="p-4">Equipo</th>
              <th className="p-4 text-center">Abonado</th>
              <th className="p-4 text-center">Deuda</th>
              <th className="p-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {equipos.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">No hay equipos registrados</td></tr>
            ) : (
              equipos.map(eq => {
                const deuda = config.inscripcion - (eq.abono || 0);
                return (
                  <tr key={eq.id} className={deuda > 0 ? 'bg-red-50/30' : ''}>
                    <td className="p-4 font-bold flex items-center gap-2">
                      <span>{eq.logo}</span> {eq.nombre}
                    </td>
                    <td className="p-4 text-center font-mono text-green-600">${eq.abono || 0}</td>
                    <td className="p-4 text-center font-mono text-red-500 font-bold">${deuda > 0 ? deuda : 0}</td>
                    <td className="p-4 text-center">
                      {deuda <= 0 ? (
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Al Día</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">Pendiente</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
