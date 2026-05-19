"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, AlertTriangle, ArrowLeft, Download, FileImage, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function CalendarioPage() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [generado, setGenerado] = useState(false);
  const [proyeccion, setProyeccion] = useState("");

  const procesarCalendario = () => {
    if(!fechaInicio || !horaInicio) {
      alert("Debes seleccionar la fecha y hora del primer partido.");
      return;
    }
    // Proyección: Asumimos un torneo promedio que dura 8 fines de semana
    const fechaObj = new Date(fechaInicio);
    fechaObj.setDate(fechaObj.getDate() + (8 * 7)); // Suma 8 semanas
    setProyeccion(`Proyección de finalización: ${fechaObj.toLocaleDateString()}`);
    setGenerado(true);
  };

  // Función para exportar la sección deseada a PDF
  const exportarPDF = async (elementoId: string, titulo: string) => {
    const input = document.getElementById(elementoId);
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.text(`GAME-LEGAL: ${titulo}`, 10, 10);
    pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
    pdf.save(`GameLegal_${titulo.replace(/\s+/g, '_')}.pdf`);
  };

  // Función para exportar a Imagen (PNG)
  const exportarImagen = async (elementoId: string, titulo: string) => {
    const input = document.getElementById(elementoId);
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2 });
    const link = document.createElement('a');
    link.download = `GameLegal_${titulo.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Calendario Oficial y Proyecciones</h1>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MÓDULO DE FIXTURE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><Calendar size={16} /> Configurar Fixture</h2>
            
            {!generado ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Día de Inicio</label>
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Hora Primer Partido</label>
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                </div>
                <button onClick={procesarCalendario} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm">
                  Proyectar y Generar
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4 bg-purple-50 text-purple-800 p-3 rounded-xl text-xs font-bold border border-purple-200">
                  <Clock size={14} className="inline mr-1"/> {proyeccion} (Fines de Semana)
                </div>
                
                {/* ESTE DIV SE EXPORTARÁ */}
                <div id="fixture-export" className="p-4 bg-white border-2 border-slate-100 rounded-xl mb-4">
                  <div className="text-center mb-4 border-b pb-2">
                    <h3 className="font-black text-gray-900">COPA GAME-LEGAL 2026</h3>
                    <p className="text-xs text-gray-500">Jornada 1 Oficial</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-black text-purple-700 uppercase block mb-1">
                      {new Date(fechaInicio).toLocaleDateString()} - {horaInicio}H
                    </span>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                      <span>FC Barcelona SC</span> <span className="text-gray-400">vs</span> <span>Liga Nocturna</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => exportarPDF('fixture-export', 'Fixture')} className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"><Download size={14}/> PDF</button>
                  <button onClick={() => exportarImagen('fixture-export', 'Fixture')} className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"><FileImage size={14}/> PNG</button>
                </div>
              </div>
            )}
          </div>

          {/* MÓDULO TABLAS Y ESTADÍSTICAS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold uppercase text-gray-700 flex items-center gap-2"><Trophy size={16} /> Tablas Generales</h2>
                <div className="flex gap-2">
                  <button onClick={() => exportarPDF('tablas-export', 'Estadisticas')} className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"><Download size={14}/> PDF</button>
                  <button onClick={() => exportarImagen('tablas-export', 'Estadisticas')} className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"><FileImage size={14}/> PNG</button>
                </div>
              </div>

              {/* ESTE DIV SE EXPORTARÁ */}
              <div id="tablas-export" className="p-4 bg-white border border-slate-100 rounded-xl">
                <div className="text-center mb-4">
                  <h3 className="font-black text-gray-900">ESTADÍSTICAS GAME-LEGAL</h3>
                </div>
                
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Goleadores</h4>
                <div className="divide-y divide-slate-100 mb-6 border rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-slate-50">
                    <div><div className="font-bold text-sm text-gray-900">Andrés Calva</div><div className="text-xs text-slate-500">FC Barcelona SC</div></div>
                    <span className="text-sm font-black text-blue-700">8 Goles</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Reporte Disciplinario</h4>
                <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center p-3 bg-slate-50">
                    <div><div className="font-bold text-sm text-gray-900">Luis Medina</div><div className="text-xs text-slate-500">C.I: 1109876543 (🟨 3)</div></div>
                    <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded">SUSPENDIDO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}