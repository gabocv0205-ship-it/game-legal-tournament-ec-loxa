import React from 'react';
import Link from 'next/link';

export default function ModuloFinanciero() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Módulo Financiero</h1>
            <p className="text-slate-500 font-medium text-sm">Control integral de ingresos, inscripciones y sanciones económicas.</p>
          </div>
          <Link href="/dashboard" className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-slate-50 transition-colors">
            Volver al Panel
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos Totales</h3>
            <p className="text-3xl font-black text-gray-900">$0.00</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuentas por Cobrar</h3>
            <p className="text-3xl font-black text-gray-900">$0.00</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Equipos Solventes</h3>
            <p className="text-3xl font-black text-gray-900">0 / 0</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">💳</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registro de Transacciones</h2>
          <p className="text-slate-500 mb-6 text-sm">Aún no hay movimientos registrados en el torneo activo.</p>
          <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors text-sm">
            + Registrar Nuevo Pago
          </button>
        </div>
      </div>
    </div>
  );
}
