"use client";
import React from "react";
import { FileText, Edit2 } from "lucide-react";

export default function Calendario() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Fixture y Horarios</h2>
          <p className="text-sm text-gray-500">Ajusta horarios antes de generar el PDF oficial.</p>
        </div>
        <button className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-md transition">
          <FileText size={18} /> Generar PDF Oficial
        </button>
      </div>

      <div className="grid gap-4">
        {/* Partido Ejemplo */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
          <div className="flex flex-col items-start gap-2 w-1/4">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">Jornada 1</span>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 group cursor-pointer hover:border-blue-400 transition-colors">
              <span className="text-sm font-bold text-gray-700">06 jun 2026 · 10:00</span>
              <Edit2 size={14} className="text-gray-400 group-hover:text-blue-500" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 flex-1">
            <div className="flex items-center gap-3 w-1/3 justify-end">
              <span className="font-bold text-lg text-gray-900">FC Celtic Loja</span>
              <span className="text-3xl">🍀</span>
            </div>
            <div className="bg-gray-100 text-gray-400 rounded-xl px-4 py-2 font-black text-sm">VS</div>
            <div className="flex items-center gap-3 w-1/3">
              <span className="text-3xl">💎</span>
              <span className="font-bold text-lg text-gray-900">Sporting Cristal</span>
            </div>
          </div>

          <div className="w-1/4 flex justify-end">
            <button className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 flex items-center gap-2 transition">
              <FileText size={16} /> Ver Planilla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}