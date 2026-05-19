"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, AlertTriangle, ArrowLeft, Download, Clock } from 'lucide-react';

export default function CalendarioPage() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [generado, setGenerado] = useState(false);
  const [proyeccion, setProyeccion] = useState("");

  useEffect(() => {
    const guardado = localStorage.getItem('game_legal_fecha');
    if (guardado) {
      const data = JSON.parse(guardado);
      setFechaInicio(data.fecha);
      setHoraInicio(data.hora);
      setProyeccion(data.proy);
      setGenerado(true);
    }
  }, []);

  const procesarCalendario = () => {
    if(!fechaInicio || !horaInicio) {
      alert("Selecciona la fecha y hora."); return;
    }
    const fechaObj = new Date(fechaInicio);
    fechaObj.setDate(fechaObj.getDate() + 56); 
    const proyTexto = `Finalización aproximada: ${fechaObj.toLocaleDateString()}`;
    
    localStorage.setItem('game_legal_fecha', JSON.stringify({ fecha: fechaInicio, hora: horaInicio, proy: proyTexto }));
    
    setProyeccion(proyTexto);
    setGenerado(true);
  };

  const imprimirPDF = () => { window.print(); };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Calendario Oficial</h1>
            </div>
          </div>
          <button onClick={imprimirPDF} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-slate-800">
            <Download size={16}/> Exportar PDF Oficial
          </button>
        </header>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none">
          <div className="text-center mb-8 pb-4 border-b">
            <h2 className="text-2xl font-black text-gray-900">COPA GAME-LEGAL 2026</h2>
            <p className="text-gray-500">Documento Oficial de Competición</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-gray-700 uppercase mb-4 flex items-center gap-2"><Calendar size={18}/> Fixture Jornada 1</h3>
              {!generado ? (
                <div className="space-y-3 print:hidden">
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full p-2 border rounded" />
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full p-2 border rounded" />
                  <button onClick={procesarCalendario} className="w-full p-2 bg-purple-600 text-white font-bold rounded">Fijar Horario</button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-xs font-black text-purple-700 uppercase block mb-2">{fechaInicio} | {horaInicio}H</span>
                  <div className="flex justify-between items-center font-bold text-gray-800">
                    <span>FC Barcelona SC</span> <span className="text-gray-400">vs</span> <span>Liga Nocturna</span>
                  </div>
                  <div className="mt-4 pt-2 border-t text-xs text-gray-500"><Clock size={12} className="inline"/> {proyeccion}</div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-gray-700 uppercase mb-4 flex items-center gap-2"><Trophy size={18}/> Estadísticas Actuales</h3>
              <div className="divide-y divide-slate-100 border rounded-xl p-3">
                <div className="flex justify-between py-2"><span className="font-bold">1. Andrés Calva</span><span className="text-blue-600 font-bold">8 Goles</span></div>
                <div className="flex justify-between py-2"><span className="font-bold">2. Gabriel Vásquez</span><span className="text-blue-600 font-bold">6 Goles</span></div>
              </div>
              
              <h3 className="font-bold text-gray-700 uppercase mt-6 mb-4 flex items-center gap-2"><AlertTriangle size={18}/> Disciplina</h3>
              <div className="border rounded-xl p-3 bg-red-50 text-red-800 font-medium text-sm">
                Luis Medina (FC Barcelona) - <span className="font-black">SUSPENDIDO</span> (3 Amarillas)
              </div>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `@media print { body { -webkit-print-color-adjust: exact; } .print\\:hidden { display: none !important; } .print\\:border-none { border: none !important; } .print\\:shadow-none { box-shadow: none !important; } .print\\:bg-white { background: white !important; } .print\\:p-0 { padding: 0 !important; } }`}} />
    </div>
  );
}
