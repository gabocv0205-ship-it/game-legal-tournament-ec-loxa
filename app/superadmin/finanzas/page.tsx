"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);

const Icons = {
  bank: "M3 21h18 M3 10h18 M5 6l7-3 7 3 M4 10v11 M20 10v11 M8 14v3 M12 14v3 M16 14v3",
  plus: "M12 5v14M5 12h14",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
};

export default function CajaFuerteSaaS() {
  const clienteAbiertoRef = useRef<string | null>(null);
  const [clienteSolicitado, setClienteSolicitado] = useState<string | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [stats, setStats] = useState({ totalIngresos: 0, clientesActivos: 0, clientesMorosos: 0 });

  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("Suscripción Mensual Pro");
  const [notas, setNotas] = useState("");
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    setClienteSolicitado(new URLSearchParams(window.location.search).get('cliente'));
    cargarContabilidad();
  }, []);

  useEffect(() => {
    if (!clienteSolicitado || loading || clienteAbiertoRef.current === clienteSolicitado) return;
    const cliente = clientes.find(item => item.id === clienteSolicitado);
    if (cliente) {
      clienteAbiertoRef.current = clienteSolicitado;
      abrirModalCobro(cliente);
    }
  }, [clienteSolicitado, clientes, loading]);

  const cargarContabilidad = async (forzarRefresco = false) => {
  setLoading(true);
  setErrorCarga("");
  try {
      const url = forzarRefresco 
      ? `/api/saas/contabilidad?t=${Date.now()}` 
      : '/api/saas/contabilidad';

    const res = await fetch(url, {
      credentials: 'include',
    });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al cargar datos');
      }

      setClientes(data.clientes);
      setHistorial(data.historial);
      setStats(data.stats);
    } catch (error: any) {
      console.error("Error contable:", error);
      setErrorCarga(error.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCobro = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setMonto("29.99");
    setNotas("");
    setMostrarModal(true);
  };

  const asentarPagoSaaS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado || !monto) return;
    setProcesando(true);

        try {
      const res = await fetch('/api/saas/cobrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organizer_id: clienteSeleccionado.id,
          amount: Number(monto),
          concept: concepto,
          notes: notas,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al asentar el pago');
      }

      setMostrarModal(false);
      alert(`✅ Asiento registrado: $${monto} cobrados a ${clienteSeleccionado.full_name || clienteSeleccionado.email}. La cuenta del cliente ha sido reactivada.`);
      cargarContabilidad(true);
    } catch (error: any) {
      alert("❌ " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-20 space-y-4"><div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div><p className="text-[#D4A017] font-black uppercase tracking-widest text-sm animate-pulse">Auditando Cuentas Corporativas...</p></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">

      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#D4A017] hover:text-white font-black uppercase tracking-widest text-xs transition-colors mb-2 bg-[#1C1C1C] px-4 py-2 rounded-lg border border-[#2E2E2E] w-fit shadow-md">
        ← Volver al Panel Principal
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#D4A017]/30 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Icon path={Icons.bank} size={28} className="text-[#D4A017]" /> Tesorería GAME-LEGAL
          </h2>
          <p className="text-gray-400 font-bold text-sm mt-1">Recaudación global de suscripciones de la plataforma</p>
        </div>
        <Link
          href="/superadmin/clientes"
          className="bg-[#141414] hover:bg-red-700 text-red-400 hover:text-white border border-red-900/50 font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl transition-all"
        >
          Ir a Bóveda de Clientes
        </Link>
      </div>

      {errorCarga && (
        <div className="bg-red-950/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm font-bold">{errorCarga}</span>
          <button onClick={() => cargarContabilidad(true)} className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-tr from-[#141414] to-[#1C1C1C] p-6 rounded-2xl border border-[#D4A017]/50 shadow-[0_0_20px_rgba(212,160,23,0.1)] relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#D4A017]/10 rounded-full blur-2xl"></div>
          <h4 className="text-[#D4A017] font-bold text-xs uppercase tracking-widest relative z-10">Flujo de Caja Total</h4>
          <p className="text-4xl font-mono font-black text-white mt-1 relative z-10">${stats.totalIngresos.toFixed(2)}</p>
        </div>
        <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] flex flex-col justify-center">
          <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest">Cartera Activa</h4>
          <p className="text-3xl font-mono font-black text-green-500 mt-1">{stats.clientesActivos} <span className="text-sm text-gray-500">Organizadores</span></p>
        </div>
        <div className="bg-[#141414] p-6 rounded-2xl border border-red-900/50 flex flex-col justify-center">
          <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest">Cuentas en Mora</h4>
          <p className="text-3xl font-mono font-black text-red-500 mt-1">{stats.clientesMorosos} <span className="text-sm text-red-800">Suspendidos/Deudores</span></p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-white font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Facturación por Cliente</h3>
        <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm text-white whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
              <tr>
                <th className="p-4">Organizador / Cliente</th>
                <th className="p-4 text-center">Estado del SaaS</th>
                <th className="p-4 text-center">Torneos</th>
                <th className="p-4 text-center">Total Facturado</th>
                <th className="p-4 text-right">Acción Contable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {clientes.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">No hay clientes registrados aún.</td></tr> : clientes.map(c => (
                <tr key={c.id} className="hover:bg-[#141414] transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-white uppercase">{c.full_name || 'Sin Nombre'}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.email}</p>
                  </td>
                  <td className="p-4 text-center">
                    {c.saas_status === 'active' ? <span className="bg-green-900/20 text-green-500 border border-green-900/50 text-[9px] font-black uppercase px-2 py-1 rounded">Solvente</span> : <span className="bg-red-900/20 text-red-500 border border-red-900/50 text-[9px] font-black uppercase px-2 py-1 rounded animate-pulse">En Mora</span>}
                  </td>
                  <td className="p-4 text-center text-gray-400 font-black">{c.max_tournaments}</td>
                  <td className="p-4 text-center text-[#D4A017] font-mono font-black">${c.totalPagado.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => abrirModalCobro(c)} className="bg-[#D4A017] text-black hover:bg-yellow-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(212,160,23,0.3)]">
                      Cobrar Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 pt-6">
        <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">Libro Mayor de Asientos SaaS</h3>
        <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm text-white whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
              <tr>
                <th className="p-4">Fecha de Asiento</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Concepto Registrado</th>
                <th className="p-4 text-right">Ingreso Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {historial.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500 italic">Libro en blanco. Aún no hay recaudaciones.</td></tr> : historial.map(h => (
                <tr key={h.id} className="hover:bg-[#141414] transition-colors">
                  <td className="p-4 text-gray-500 font-mono text-xs">{new Date(h.created_at).toLocaleString('es-EC')}</td>
                  <td className="p-4 font-bold uppercase">{h.profiles?.full_name || h.profiles?.email}</td>
                  <td className="p-4">
                    <span className="text-gray-300 font-bold text-xs block">{h.concept}</span>
                    {h.notes && <span className="text-gray-500 text-[10px]">{h.notes}</span>}
                  </td>
                  <td className="p-4 text-right text-green-400 font-mono font-black">+ ${Number(h.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1C1C1C] w-full max-w-md border border-[#D4A017]/50 rounded-2xl shadow-[0_0_50px_rgba(212,160,23,0.15)] overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-[#2E2E2E]">
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Icon path={Icons.plus} size={20} className="text-[#D4A017]" /> Registrar Ingreso SaaS
              </h3>
              <p className="text-gray-400 text-xs mt-2 uppercase tracking-wide">Cliente: <span className="text-white font-bold">{clienteSeleccionado?.full_name || clienteSeleccionado?.email}</span></p>
            </div>

            <form onSubmit={asentarPagoSaaS} className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-[#D4A017] uppercase tracking-widest">Plan / Concepto</label>
                <input type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:border-[#D4A017] outline-none transition-colors" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#D4A017] uppercase tracking-widest">Monto Recibido ($)</label>
                <input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white font-mono text-2xl p-4 rounded-xl focus:border-[#D4A017] outline-none transition-colors" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#D4A017] uppercase tracking-widest">Notas Contables (Opcional)</label>
                <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-gray-300 p-3 rounded-xl focus:border-[#D4A017] outline-none text-xs" placeholder="Ej: Pago mediante transferencia bancaria" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#2E2E2E]">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-[#141414] text-gray-400 font-bold uppercase tracking-widest text-xs rounded-xl hover:text-white transition-all">Cancelar</button>
                <button type="submit" disabled={procesando} className="flex-1 py-3 bg-[#D4A017] text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:bg-yellow-500 transition-all disabled:opacity-50">
                  {procesando ? "Asentando..." : "Asentar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
