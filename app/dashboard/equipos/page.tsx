"use client";
import React, { useState, useEffect } from "react";

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<any[]>([]);

  useEffect(() => {
    const eq = localStorage.getItem('gl_equipos');
    if (eq) setEquipos(JSON.parse(eq));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Clubes Inscritos</h2>
          <p className="text-gray-500">Administra los equipos que participan en la temporada actual.</p>
        </div>
        <button className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md">
          + Inscribir Equipo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipos.length === 0 ? (
          <p className="text-gray-400 col-span-3">No hay equipos registrados todavía. Utiliza el botón superior para añadir el primero.</p>
        ) : (
          equipos.map(eq => (
            <div key={eq.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl border border-gray-200">
                {eq.logo || '⚽'}
              </div>
              <div>
                <h3 className="font-bold text-lg">{eq.nombre}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${eq.deuda > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {eq.deuda > 0 ? `Debe $${eq.deuda}` : 'Pagado'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
