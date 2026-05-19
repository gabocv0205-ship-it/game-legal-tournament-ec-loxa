"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, UserPlus, Users, ArrowLeft, AlertTriangle } from 'lucide-react';

interface Jugador {
  nombre: string;
  cedula: string;
}

interface Equipo {
  id: number;
  nombre: string;
  escudo: string;
  plantilla: Jugador[];
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([
    { id: 1, nombre: "FC Barcelona SC", escudo: "https://placehold.co/100x100?text=BSC", plantilla: [{ nombre: "Carlos Flores", cedula: "1101234567" }] }
  ]);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [nombreJugador, setNombreJugador] = useState("");
  const [cedulaJugador, setCedulaJugador] = useState("");
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<number | null>(1);
  const [advertencia, setAdvertencia] = useState("");

  const agregarEquipo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEquipo) return;
    const item: Equipo = {
      id: Date.now(),
      nombre: nuevoEquipo,
      escudo: `https://placehold.co/100x100?text=${nuevoEquipo.substring(0,3).toUpperCase()}`,
      plantilla: []
    };
    setEquipos([...equipos, item]);
    setNuevoEquipo("");
  };

  const agregarJugador = (e: React.FormEvent) => {
    e.preventDefault();
    setAdvertencia("");

    if (!nombreJugador || !cedulaJugador || equipoSeleccionado === null) return;
    
    // SISTEMA ANTI-DUPLICADOS: Verificamos si la cédula ya existe en CUALQUIER equipo
    const jugadorDuplicado = equipos.some(eq => 
      eq.plantilla.some(jugador => jugador.cedula === cedulaJugador)
    );

    if (jugadorDuplicado) {
      setAdvertencia(`¡Alerta Legal! La cédula ${cedulaJugador} ya se encuentra inscrita en otro equipo del torneo.`);
      return;
    }
    
    setEquipos(equipos.map(eq => {
      if (eq.id === equipoSeleccionado) {
        return {
          ...eq,
          plantilla: [...eq.plantilla, { nombre: nombreJugador, cedula: cedulaJugador }]
        };
      }
      return eq;
    }));
    setNombreJugador("");
    setCedulaJugador("");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Control de Plantillas Oficiales</h1>
              <p className="text-slate-500 text-sm font-medium">Registro con validación de identidad (Cédula).</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <form onSubmit={agregarEquipo} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><Shield size={16} /> Registrar Club</h2>
              <input type="text" placeholder="Nombre del Equipo" value={nuevoEquipo} onChange={(e) => setNuevoEquipo(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none mb-3" />
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors">Inscribir Club</button>
            </form>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><Users size={16} /> Clubes Inscritos</h2>
              <div className="space-y-2">
                {equipos.map(eq => (
                  <div key={eq.id} onClick={() => setEquipoSeleccionado(eq.id)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${equipoSeleccionado === eq.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100'}`}>
                    <img src={eq.escudo} alt="Escudo" className="w-10 h-10 rounded-lg bg-slate-200 object-cover" />
                    <div>
                      <div className="font-bold text-sm text-gray-900">{eq.nombre}</div>
                      <div className="text-xs text-slate-500">{eq.plantilla.length} Jugadores</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {equipoSeleccionado && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-600" /> Nómina: {equipos.find(e => e.id === equipoSeleccionado)?.nombre}
                </h2>
                
                {advertencia && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold flex items-center gap-2">
                    <AlertTriangle size={18} /> {advertencia}
                  </div>
                )}

                <form onSubmit={agregarJugador} className="grid grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input type="text" placeholder="Nombre Completo" value={nombreJugador} onChange={(e) => setNombreJugador(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none" />
                  <input type="text" placeholder="Número de Cédula" value={cedulaJugador} onChange={(e) => setCedulaJugador(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none" />
                  <button type="submit" className="col-span-2 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors">
                    Verificar y Fichar Jugador
                  </button>
                </form>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-gray-500 uppercase">
                        <th className="p-3">C.I. (Identidad)</th>
                        <th className="p-3">Nombre del Jugador</th>
                        <th className="p-3 text-right">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {equipos.find(e => e.id === equipoSeleccionado)?.plantilla.map((jug, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-blue-600 font-mono">{jug.cedula}</td>
                          <td className="p-3 font-semibold text-gray-800">{jug.nombre}</td>
                          <td className="p-3 text-right"><span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">Verificado</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}