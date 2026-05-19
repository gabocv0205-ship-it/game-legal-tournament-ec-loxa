"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, ArrowLeft, PlusCircle } from 'lucide-react';

interface Cuenta { id: number; equipo: string; costoBase: number; descuento: number; abonado: number; }

export default function FinanzasPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [equipoReq, setEquipoReq] = useState("");
  const [costoBase, setCostoBase] = useState("200");
  const [descuento, setDescuento] = useState("0");
  const [abono, setAbono] = useState("0");

  useEffect(() => {
    const data = localStorage.getItem('gl_finanzas');
    if (data) setCuentas(JSON.parse(data));
  }, []);

  useEffect(() => {
    if(cuentas.length > 0) localStorage.setItem('gl_finanzas', JSON.stringify(cuentas));
  }, [cuentas]);

  const registrarCuenta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoReq) return;
    const nueva: Cuenta = {
      id: Date.now(), equipo: equipoReq,
      costoBase: parseFloat(costoBase), descuento: parseFloat(descuento), abonado: parseFloat(abono)
    };
    setCuentas([nueva, ...cuentas]);
    setEquipoReq(""); setAbono("0"); setDescuento("0");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 bg-white border rounded-xl"><ArrowLeft size={18} /></Link>
          <h1 className="text-3xl font-black text-gray-900">Módulo Contable de Inscripciones</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={registrarCuenta} className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
            <h2 className="font-bold mb-4 flex items-center gap-2"><PlusCircle size={16}/> Aperturar Cuenta de Equipo</h2>
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-gray-500">Nombre del Equipo</label>
              <input type="text" value={equipoReq} onChange={e=>setEquipoReq(e.target.value)} className="w-full p-2 border rounded text-sm" required/></div>
              
              <div><label className="text-xs font-bold text-gray-500">Valor de Inscripción ($)</label>
              <input type="number" value={costoBase} onChange={e=>setCostoBase(e.target.value)} className="w-full p-2 border rounded text-sm" required/></div>
              
              <div><label className="text-xs font-bold text-gray-500">Descuento Comercial ($)</label>
              <input type="number" value={descuento} onChange={e=>setDescuento(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>
              
              <div><label className="text-xs font-bold text-gray-500">Primer Abono / Pago Inicial ($)</label>
              <input type="number" value={abono} onChange={e=>setAbono(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>
              
              <button type="submit" className="w-full py-2 bg-emerald-600 text-white font-bold rounded">Guardar Liquidación</button>
            </div>
          </form>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="font-bold mb-4 flex items-center gap-2"><DollarSign size={16}/> Libro Mayor de Equipos</h2>
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-100 text-xs text-gray-500"><th className="p-2">Equipo</th><th className="p-2">Base</th><th className="p-2">Dcto</th><th className="p-2">Abonado</th><th className="p-2">Saldo a Pagar</th></tr></thead>
              <tbody className="text-sm">
                {cuentas.map(c => {
                  const saldo = c.costoBase - c.descuento - c.abonado;
                  return (
                    <tr key={c.id} className="border-b">
                      <td className="p-2 font-bold">{c.equipo}</td>
                      <td className="p-2">${c.costoBase}</td>
                      <td className="p-2 text-orange-600">-${c.descuento}</td>
                      <td className="p-2 text-emerald-600 font-bold">${c.abonado}</td>
                      <td className="p-2 font-black text-red-600">${saldo}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
