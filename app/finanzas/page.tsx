"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { DollarSign, ArrowLeft, PlusCircle } from 'lucide-react';

interface RegistroFinanciero {
  id: number;
  equipo: string;
  total: number;
  abonado: number;
  formaPago: string;
}

export default function FinanzasPage() {
  const [cuentas, setCuentas] = useState<RegistroFinanciero[]>([
    { id: 1, equipo: "FC Barcelona SC", total: 200.00, abonado: 120.00, formaPago: "Transferencia" }
  ]);
  const [eq, setEq] = useState("");
  const [abono, setAbono] = useState("");
  const [metodo, setMetodo] = useState("Transferencia");

  const procesarPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eq || !abono) return;
    const nuevoPago: RegistroFinanciero = {
      id: Date.now(),
      equipo: eq,
      total: 200.00,
      abonado: parseFloat(abono),
      formaPago: metodo
    };
    setCuentas([nuevoPago, ...cuentas]);
    setEq("");
    setAbono("");
  };

  const ingresosTotales = cuentas.reduce((acc, c) => acc + c.abonado, 0);
  const cuentasPorCobrar = cuentas.reduce((acc, c) => acc + (c.total - c.abonado), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Módulo Financiero y Liquidaciones</h1>
              <p className="text-slate-500 text-sm font-medium">Control contable de aranceles de inscripción y garantías del torneo.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Caja Central (Ingresos Recaudados)</h3>
            <p className="text-3xl font-black text-gray-900">${ingresosTotales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuentas por Cobrar (Saldos Pendientes)</h3>
            <p className="text-3xl font-black text-gray-900">${cuentasPorCobrar.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={procesarPago} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><PlusCircle size={16} /> Cargar Recibo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Equipo</label>
                <input type="text" value={eq} onChange={(e) => setEq(e.target.value)} placeholder="Ej. FC Barcelona SC" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-900" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto Abonado ($)</label>
                <input type="number" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-900" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Forma de Pago</label>
                <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-900">
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo Líquido</option>
                  <option value="Depósito">Depósito Directo</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors">
                Asentar en Libro Diario
              </button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold uppercase text-gray-700 mb-4 flex items-center gap-2"><DollarSign size={16} /> Balance de Auditoría General</h2>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-gray-500 uppercase">
                    <th className="p-3">Equipo</th>
                    <th className="p-3">Arancel Total</th>
                    <th className="p-3">Abonado</th>
                    <th className="p-3">Saldo Restante</th>
                    <th className="p-3">Método</th>
                    <th className="p-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {cuentas.map(c => {
                    const saldo = c.total - c.abonado;
                    const estado = saldo <= 0 ? 'Completo' : c.abonado > 0 ? 'Abono' : 'Pendiente';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-gray-900">{c.equipo}</td>
                        <td className="p-3 font-medium text-gray-600">${c.total.toFixed(2)}</td>
                        <td className="p-3 font-semibold text-emerald-600">${c.abonado.toFixed(2)}</td>
                        <td className="p-3 font-semibold text-orange-600">${saldo.toFixed(2)}</td>
                        <td className="p-3 text-xs text-gray-500 font-medium">{c.formaPago}</td>
                        <td className="p-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${estado === 'Completo' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
