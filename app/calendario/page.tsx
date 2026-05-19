"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, ArrowLeft, Download } from 'lucide-react';

interface Partido { id: number; local: string; visitante: string; gl: number; gv: number; jugado: boolean; fecha: string; }

export default function CalendarioPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [eqL, setEqL] = useState(""); const [eqV, setEqV] = useState(""); const [fechaP, setFechaP] = useState("");

  useEffect(() => {
    const data = localStorage.getItem('gl_partidos');
    if (data) setPartidos(JSON.parse(data));
  }, []);

  useEffect(() => {
    if(partidos.length > 0) localStorage.setItem('gl_partidos', JSON.stringify(partidos));
  }, [partidos]);

  const agregarPartido = (e: React.FormEvent) => {
    e.preventDefault();
    setPartidos([...partidos, { id: Date.now(), local: eqL, visitante: eqV, gl: 0, gv: 0, jugado: false, fecha: fechaP }]);
    setEqL(""); setEqV(""); setFechaP("");
  };

  const guardarResultado = (id: number, gl: number, gv: number) => {
    setPartidos(partidos.map(p => p.id === id ? { ...p, gl, gv, jugado: true } : p));
  };

  // Motor Matemático: Calcula la tabla de posiciones en tiempo real
  const calcularTabla = () => {
    const tabla: Record<string, { pj: number, pg: number, pe: number, pp: number, gf: number, gc: number, pts: number }> = {};
    
    partidos.forEach(p => {
      if (!p.jugado) return;
      if (!tabla[p.local]) tabla[p.local] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
      if (!tabla[p.visitante]) tabla[p.visitante] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };

      tabla[p.local].pj += 1; tabla[p.visitante].pj += 1;
      tabla[p.local].gf += p.gl; tabla[p.visitante].gf += p.gv;
      tabla[p.local].gc += p.gv; tabla[p.visitante].gc += p.gl;

      if (p.gl > p.gv) { tabla[p.local].pts += 3; tabla[p.local].pg += 1; tabla[p.visitante].pp += 1; }
      else if (p.gv > p.gl) { tabla[p.visitante].pts += 3; tabla[p.visitante].pg += 1; tabla[p.local].pp += 1; }
      else { tabla[p.local].pts += 1; tabla[p.visitante].pts += 1; tabla[p.local].pe += 1; tabla[p.visitante].pe += 1; }
    });

    return Object.entries(tabla).sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border rounded-xl"><ArrowLeft size={18} /></Link>
            <h1 className="text-3xl font-black text-gray-900">Resultados y Tabla de Posiciones</h1>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl flex gap-2"><Download size={16}/> Exportar PDF</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6 print:hidden">
            <form onSubmit={agregarPartido} className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="font-bold mb-4 flex items-center gap-2"><Calendar size={16}/> Programar Encuentro</h2>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Equipo Local" value={eqL} onChange={e=>setEqL(e.target.value)} className="flex-1 p-2 border rounded text-sm"/>
                <input type="text" placeholder="Visitante" value={eqV} onChange={e=>setEqV(e.target.value)} className="flex-1 p-2 border rounded text-sm"/>
              </div>
              <input type="datetime-local" value={fechaP} onChange={e=>setFechaP(e.target.value)} className="w-full p-2 border rounded text-sm mb-2"/>
              <button type="submit" className="w-full py-2 bg-purple-600 text-white font-bold rounded">Guardar Partido</button>
            </form>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="font-bold mb-4">Ingresar Resultados</h2>
              {partidos.map(p => (
                <div key={p.id} className="mb-4 p-3 border rounded bg-slate-50">
                  <div className="text-xs text-gray-500 mb-2">{new Date(p.fecha).toLocaleString()}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold flex-1">{p.local}</span>
                    <input type="number" defaultValue={p.gl} onChange={e => guardarResultado(p.id, parseInt(e.target.value), p.gv)} className="w-12 p-1 border text-center font-bold text-blue-600"/>
                    <span>-</span>
                    <input type="number" defaultValue={p.gv} onChange={e => guardarResultado(p.id, p.gl, parseInt(e.target.value))} className="w-12 p-1 border text-center font-bold text-blue-600"/>
                    <span className="font-bold flex-1 text-right">{p.visitante}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500"/> Tabla Oficial de Posiciones</h2>
            <table className="w-full text-center border-collapse text-sm">
              <thead><tr className="bg-slate-100 text-gray-600"><th className="p-2 text-left">Equipo</th><th className="p-2">PTS</th><th className="p-2">PJ</th><th className="p-2">PG</th><th className="p-2">PE</th><th className="p-2">PP</th><th className="p-2">GF</th><th className="p-2">GC</th></tr></thead>
              <tbody>
                {calcularTabla().map((fila, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 text-left font-bold">{fila[0]}</td>
                    <td className="p-2 font-black text-blue-700 text-lg">{fila[1].pts}</td>
                    <td className="p-2">{fila[1].pj}</td><td className="p-2">{fila[1].pg}</td><td className="p-2">{fila[1].pe}</td><td className="p-2">{fila[1].pp}</td>
                    <td className="p-2 text-green-600">{fila[1].gf}</td><td className="p-2 text-red-600">{fila[1].gc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@media print { .print\\:hidden { display: none !important; } }`}} />
    </div>
  );
}
