"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, UserPlus, Users, ArrowLeft, AlertTriangle } from 'lucide-react';

interface Jugador { nombre: string; cedula: string; }
interface Equipo { id: number; nombre: string; plantilla: Jugador[]; }

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([
    { id: 1, nombre: "FC Barcelona SC", plantilla: [] }
  ]);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [nombreJugador, setNombreJugador] = useState("");
  const [cedulaJugador, setCedulaJugador] = useState("");
  const [equipoSel, setEquipoSel] = useState<number>(1);
  const [alerta, setAlerta] = useState("");

  const agregarEquipo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEquipo) return;
    const nuevo = { id: Date.now(), nombre: nuevoEquipo, plantilla: [] };
    setEquipos([...equipos, nuevo]);
    setEquipoSel(nuevo.id); 
    setNuevoEquipo("");
  };

  const ficharJugador = (e: React.FormEvent) => {
    e.preventDefault();
    setAlerta("");

    if (!nombreJugador || !cedulaJugador) return;
    
    // Verificador Anti-Doble Inscripción
    const duplicado = equipos.some(eq => eq.plantilla.some(j => j.cedula === cedulaJugador));
    if (duplicado) {
      setAlerta(`⚠️ ILEGAL: La cédula ${cedulaJugador} ya está registrada en otro club.`);
      return;
    }
    
    setEquipos(equipos.map(eq => {
      if (eq.id === equipoSel) {
        return { ...eq, plantilla: [...eq.plantilla, { nombre: nombreJugador, cedula: cedulaJugador }] };
      }
      return eq;
    }));
    
    setNombreJugador(""); setCedulaJugador("");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 bg-white border rounded-xl"><ArrowLeft size={18} /></Link>
          <h1 className="text-3xl font-black text-gray-900">Control Oficial de Plantillas</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <form onSubmit={agregarEquipo} className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="font-bold mb-3"><Shield size={16} className="inline mr-2"/> Registrar Club</h2>
              <input type="text" value={nuevoEquipo} onChange={e => setNuevoEquipo(e.target.value)} placeholder="Nombre del Equipo" className="w-full p-2 border rounded mb-2" />
              <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded">Inscribir</button>
            </form>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="font-bold mb-3"><Users size={16} className="inline mr-2"/> Clubes</h2>
              {equipos.map(eq => (
                <div key={eq.id} onClick={() => setEquipoSel(eq.id)} className={`p-3 border rounded cursor-pointer mb-2 ${equipoSel === eq.id ? 'bg-blue-50 border-blue-500' : ''}`}>
                  <span className="font-bold">{eq.nombre}</span> <span className="text-xs text-gray-500">({eq.plantilla.length} Jugs)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
              <h2 className="text-xl font-bold mb-4">Nómina: {equipos.find(e => e.id === equipoSel)?.nombre}</h2>
              {alerta && <div className="mb-4 p-3 bg-red-100 text-red-700 font-bold rounded border border-red-300">{alerta}</div>}

              <form onSubmit={ficharJugador} className="flex gap-2 mb-6">
                <input type="text" placeholder="Nombre Jugador" value={nombreJugador} onChange={e=>setNombreJugador(e.target.value)} className="flex-1 p-2 border rounded" />
                <input type="text" placeholder="Cédula" value={cedulaJugador} onChange={e=>setCedulaJugador(e.target.value)} className="flex-1 p-2 border rounded" />
                <button type="submit" className="px-4 bg-slate-900 text-white font-bold rounded">Fichar</button>
              </form>

              <table className="w-full text-left">
                <thead><tr className="bg-slate-100 text-sm"><th className="p-2">Cédula</th><th className="p-2">Nombre</th></tr></thead>
                <tbody>
                  {equipos.find(e => e.id === equipoSel)?.plantilla.map((j, i) => (
                    <tr key={i} className="border-b"><td className="p-2 font-mono text-blue-600">{j.cedula}</td><td className="p-2">{j.nombre}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
