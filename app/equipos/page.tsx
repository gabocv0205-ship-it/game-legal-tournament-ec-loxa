"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, UserPlus, Users, ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';

interface Jugador { id: number; nombre: string; cedula: string; }
interface Equipo { id: number; nombre: string; plantilla: Jugador[]; }

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [nuevoEquipo, setNuevoEquipo] = useState("");
  const [nombreJugador, setNombreJugador] = useState("");
  const [cedulaJugador, setCedulaJugador] = useState("");
  const [equipoSel, setEquipoSel] = useState<number | null>(null);
  const [alerta, setAlerta] = useState("");

  useEffect(() => {
    const data = localStorage.getItem('gl_equipos');
    if (data) {
      const parsed = JSON.parse(data);
      setEquipos(parsed);
      if (parsed.length > 0) setEquipoSel(parsed[0].id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gl_equipos', JSON.stringify(equipos));
  }, [equipos]);

  const agregarEquipo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEquipo) return;
    const nuevo = { id: Date.now(), nombre: nuevoEquipo, plantilla: [] };
    setEquipos([...equipos, nuevo]);
    setEquipoSel(nuevo.id); 
    setNuevoEquipo("");
  };

  const eliminarEquipo = (id: number, nombre: string) => {
    if(confirm(`¿Eliminar definitivamente el equipo ${nombre}?`)) {
      const resto = equipos.filter(eq => eq.id !== id);
      setEquipos(resto);
      if(equipoSel === id) setEquipoSel(resto.length > 0 ? resto[0].id : null);
    }
  };

  const ficharJugador = (e: React.FormEvent) => {
    e.preventDefault();
    setAlerta("");
    if (!nombreJugador || !cedulaJugador) return;
    
    const duplicado = equipos.some(eq => eq.plantilla.some(j => j.cedula === cedulaJugador));
    if (duplicado) { setAlerta(`⚠️ ILEGAL: La cédula ${cedulaJugador} ya está registrada.`); return; }
    
    setEquipos(equipos.map(eq => {
      if (eq.id === equipoSel) return { ...eq, plantilla: [...eq.plantilla, { id: Date.now(), nombre: nombreJugador, cedula: cedulaJugador }] };
      return eq;
    }));
    setNombreJugador(""); setCedulaJugador("");
  };

  const eliminarJugador = (idJugador: number) => {
    setEquipos(equipos.map(eq => {
      if (eq.id === equipoSel) return { ...eq, plantilla: eq.plantilla.filter(j => j.id !== idJugador) };
      return eq;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 bg-white border rounded-xl"><ArrowLeft size={18} className="text-gray-900" /></Link>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Control de Plantillas</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <form onSubmit={agregarEquipo} className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield size={16}/> Registrar Club</h2>
              <input type="text" value={nuevoEquipo} onChange={e => setNuevoEquipo(e.target.value)} placeholder="Nombre del Equipo" className="w-full p-3 border border-slate-300 rounded-xl text-sm mb-4 bg-white text-gray-900 placeholder-slate-400 font-medium" />
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">Inscribir Club</button>
            </form>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Users size={16}/> Clubes Inscritos</h2>
              {equipos.length === 0 && <p className="text-sm text-gray-500">No hay clubes registrados.</p>}
              {equipos.map(eq => (
                <div key={eq.id} className={`flex justify-between items-center p-3 border rounded-xl cursor-pointer mb-2 transition-colors ${equipoSel === eq.id ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-slate-50'}`}>
                  <div onClick={() => setEquipoSel(eq.id)} className="flex-1">
                    <span className="font-bold text-gray-900">{eq.nombre}</span> <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full ml-1">{eq.plantilla.length}</span>
                  </div>
                  <button onClick={() => eliminarEquipo(eq.id, eq.nombre)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {equipoSel && (
              <div className="bg-white p-4 md:p-6 rounded-3xl border shadow-sm overflow-hidden">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Nómina Oficial: <span className="text-blue-600">{equipos.find(e => e.id === equipoSel)?.nombre}</span></h2>
                {alerta && <div className="mb-4 p-3 bg-red-100 text-red-700 font-bold rounded-xl border border-red-300 flex items-center gap-2"><AlertTriangle size={18}/> {alerta}</div>}

                <form onSubmit={ficharJugador} className="flex flex-col md:flex-row gap-2 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input type="text" placeholder="Nombre Jugador" value={nombreJugador} onChange={e=>setNombreJugador(e.target.value)} className="flex-1 p-3 border border-slate-300 rounded-lg text-sm bg-white text-gray-900 placeholder-slate-400 font-medium" />
                  <input type="text" placeholder="Cédula" value={cedulaJugador} onChange={e=>setCedulaJugador(e.target.value)} className="flex-1 p-3 border border-slate-300 rounded-lg text-sm bg-white text-gray-900 placeholder-slate-400 font-medium" />
                  <button type="submit" className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-md transition-colors">Fichar</button>
                </form>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-slate-100 text-xs uppercase text-gray-600 font-bold"><th className="p-3 border-b">Cédula</th><th className="p-3 border-b">Nombre</th><th className="p-3 border-b text-center">Acción</th></tr></thead>
                    <tbody className="text-sm">
                      {equipos.find(e => e.id === equipoSel)?.plantilla.map((j) => (
                        <tr key={j.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-600">{j.cedula}</td>
                          <td className="p-3 font-bold text-gray-800">{j.nombre}</td>
                          <td className="p-3 text-center"><button onClick={() => eliminarJugador(j.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded font-bold text-xs transition-colors">Dar de Baja</button></td>
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
