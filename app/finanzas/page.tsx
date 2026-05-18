"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function ModuloFinanciero() {
  const [transacciones, setTransacciones] = useState<{id: number, concepto: string, monto: number}[]>([]);

  const registrarNuevoPago = () => {
    const nuevaTransaccion = {
      id: Date.now(),
      concepto: "Abono de Inscripción - Equipo Local",
      monto: 150.00
    };
    setTransacciones([nuevaTransaccion, ...transacciones]);
  };

  const totalIngresos = transacciones.reduce((acc, curr) => acc + curr.monto, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Módulo Financiero</h1>
            <p className="text-slate-500 font-medium text-sm">Control integral de ingresos e inscripciones.</p>
          </div>
          <Link href="/dashboard" className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-slate-50 transition-colors">
            Volver al Panel
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos Totales</h3>
            <p className="text-3xl font-black text-gray-900">${totalIngresos.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">💳 Registro de Transacciones</h2>
            <button onClick={registrarNuevoPago} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm">
              + Registrar Pago
            </button>
          </div>
          
          {transacciones.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Aún no hay movimientos registrados en el torneo activo.</p>
          ) : (
            <div className="space-y-3">
              {transacciones.map(t => (
                <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-medium text-gray-800 text-sm">{t.concepto}</span>
                  <span className="font-black text-emerald-600">+ ${t.monto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
