"use client";
import React from "react";
import { Download, Plus, CreditCard } from "lucide-react";

export default function Finanzas() {
  return (
    <div className="space-y-6">
      <header className="mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="font-black text-gray-800 text-lg">Módulo Financiero</h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-sm font-medium opacity-80">Recaudado (USD)</p>
          <p className="text-4xl font-black mt-1">$200.00</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-sm font-medium opacity-80">Cartera Vencida (USD)</p>
          <p className="text-4xl font-black mt-1">$250.00</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-center gap-2 shadow-sm">
          <button className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-700 font-bold py-2.5 rounded-xl hover:bg-blue-100 transition"><Download size={18}/> Reporte Excel</button>
          <button className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-100 transition"><Plus size={18}/> Registrar Pago</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><CreditCard size={18} /> Historial de Transacciones</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
            <tr>
              <th className="px-6 py-3">Equipo</th>
              <th className="px-6 py-3">Concepto</th>
              <th className="px-6 py-3 text-center">Estado</th>
              <th className="px-6 py-3 text-center">Abonado / Total</th>
              <th className="px-6 py-3">Método / Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 font-bold text-gray-900">🍀 FC Celtic Loja</td>
              <td className="px-6 py-4 text-gray-600">Inscripción</td>
              <td className="px-6 py-4 text-center"><span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">Pagado</span></td>
              <td className="px-6 py-4 text-center font-black text-gray-900">$150.00</td>
              <td className="px-6 py-4"><div className="text-xs font-semibold text-gray-900">Transferencia</div></td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 font-bold text-gray-900">💎 Sporting Cristal</td>
              <td className="px-6 py-4 text-gray-600">Inscripción</td>
              <td className="px-6 py-4 text-center"><span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Parcial</span></td>
              <td className="px-6 py-4 text-center font-black text-gray-900">$50.00 <span className="text-xs text-gray-400 font-normal">/ $150.00</span></td>
              <td className="px-6 py-4"><div className="text-xs font-semibold text-gray-900">Efectivo</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}