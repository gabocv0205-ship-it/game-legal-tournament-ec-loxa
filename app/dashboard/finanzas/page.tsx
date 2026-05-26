"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FinanzasPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [inscripcion, setInscripcion] = useState(150);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Estados para el resumen financiero (KPIs)
  const [stats, setStats] = useState({ totalEsperado: 0, totalRecaudado: 0, totalDeuda: 0 });

  // Estados para el Modal de Pagos
  const [mostrarModal, setMostrarModal] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<any>(null);
  const [montoPago, setMontoPago] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: tourney } = await supabase.from("tournaments").select("id, registration_fee").limit(1).single();
      
      if (!tourney) {
        setLoading(false);
        return;
      }

      const cuota = Number(tourney.registration_fee || 150);
      setInscripcion(cuota);

      const { data: teams } = await supabase.from("teams").select("*, payments(amount)").eq("tournament_id", tourney.id);
      
      let sumEsperado = 0;
      let sumRecaudado = 0;
      let sumDeuda = 0;

      const calc = teams?.map(t => {
        const pagado = t.payments?.reduce((sum: number, p: { amount: string | number }) => sum + Number(p.amount), 0) || 0;
        const deuda = cuota - pagado;
        
        sumEsperado += cuota;
        sumRecaudado += pagado;
        sumDeuda += (deuda > 0 ? deuda : 0);

        return { ...t, pagado, deuda: deuda > 0 ? deuda : 0, cuota };
      }) || [];

      // Ordenar: Primero los que deben, luego los que están al día
      calc.sort((a, b) => b.deuda - a.deuda);

      setEquipos(calc);
      setStats({ totalEsperado: sumEsperado, totalRecaudado: sumRecaudado, totalDeuda: sumDeuda });
    } catch (error) {
      console.error("Error al cargar finanzas:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalPago = (equipo: any) => {
    setEquipoSeleccionado(equipo);
    setMontoPago(equipo.deuda.toString()); // Sugerir el monto total de la deuda
    setMostrarModal(true);
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoSeleccionado || !montoPago || Number(montoPago) <= 0) return alert("Ingresa un monto válido.");
    
    setProcesando(true);
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      if (!tourney) throw new Error("Torneo no encontrado");

      // SOLUCIÓN AL ERROR DE CACHÉ: 
      // Omitimos payment_date. La base de datos de Supabase asignará la fecha exacta automáticamente (DEFAULT NOW()).
      const { error } = await supabase.from("payments").insert([{
        tournament_id: tourney.id,
        team_id: equipoSeleccionado.id,
        amount: Number(montoPago)
      }]);

      if (error) throw error;

      setMostrarModal(false);
      setMontoPago("");
      setEquipoSeleccionado(null);
      alert(`Pago de $${montoPago} registrado exitosamente a ${equipoSeleccionado.name}`);
      cargarDatos(); // Recargar la tabla y KPIs
    } catch (error: any) {
      alert("Error al registrar el pago: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#D4A017] font-black uppercase tracking-widest text-sm animate-pulse">Calculando Finanzas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#2E2E2E] pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">Control Financiero</h2>
          <p className="text-gray-400 font-bold text-sm mt-1">Gestión de cobros e inscripciones</p>
        </div>
        <div className="bg-[#1C1C1C] px-4 py-2 rounded-xl border border-[#D4A017]/30 flex items-center gap-2">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Cuota de Inscripción:</span>
          <span className="text-[#D4A017] font-black text-lg">${inscripcion}</span>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest relative z-10">Total Esperado</h4>
          <p className="text-3xl font-mono font-black text-white mt-1 relative z-10">${stats.totalEsperado}</p>
        </div>
        
        <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-[#D4A017]/50 shadow-[0_0_15px_rgba(212,160,23,0.1)] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A017]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <h4 className="text-[#D4A017] font-bold text-xs uppercase tracking-widest relative z-10">Total Recaudado</h4>
          <p className="text-3xl font-mono font-black text-[#D4A017] mt-1 relative z-10">${stats.totalRecaudado}</p>
        </div>

        <div className="bg-[#141414] p-6 rounded-2xl border border-red-900/50 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest relative z-10">Deuda Pendiente</h4>
          <p className="text-3xl font-mono font-black text-red-500 mt-1 relative z-10">${stats.totalDeuda}</p>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE EQUIPOS */}
      <div className="bg-[#1C1C1C] rounded-2xl shadow-2xl border border-[#2E2E2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
              <tr>
                <th className="p-4">Equipo</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Pagado</th>
                <th className="p-4 text-center">Saldo Restante</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {equipos.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">No hay equipos registrados en este torneo.</td></tr>
              ) : (
                equipos.map(eq => (
                  <tr key={eq.id} className="hover:bg-[#141414] transition-colors">
                    <td className="p-4 font-bold flex items-center gap-3">
                      {eq.shield_url ? <img src={eq.shield_url} className="w-8 h-8 object-contain" alt="Escudo" /> : <div className="w-8 h-8 bg-[#2e2e2e] rounded-full"></div>}
                      {eq.name}
                    </td>
                    <td className="p-4 text-center">
                      {eq.deuda === 0 ? (
                        <span className="inline-block border border-green-600 text-green-500 bg-green-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Al Día</span>
                      ) : eq.pagado > 0 ? (
                        <span className="inline-block border border-yellow-600 text-yellow-500 bg-yellow-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Abono</span>
                      ) : (
                        <span className="inline-block border border-red-600 text-red-500 bg-red-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded animate-pulse">Pendiente</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-green-400 font-mono font-bold">${eq.pagado}</td>
                    <td className="p-4 text-center text-red-400 font-mono font-black">${eq.deuda > 0 ? eq.deuda : 0}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => abrirModalPago(eq)}
                        disabled={eq.deuda === 0}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${eq.deuda === 0 ? 'bg-[#2e2e2e] text-gray-600 cursor-not-allowed' : 'bg-[#D4A017] text-black hover:bg-yellow-500 shadow-lg shadow-[#D4A017]/20'}`}
                      >
                        {eq.deuda === 0 ? 'Cancelado' : 'Cobrar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA REGISTRAR PAGO */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1C1C1C] w-full max-w-md border border-[#D4A017] rounded-2xl shadow-[0_0_50px_rgba(212,160,23,0.15)] overflow-hidden">
            <div className="p-6 border-b border-[#2E2E2E]">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Registrar Pago</h3>
              <p className="text-[#D4A017] font-bold text-sm mt-1">{equipoSeleccionado?.name}</p>
            </div>
            
            <form onSubmit={registrarPago} className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monto a abonar ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="1"
                  max={equipoSeleccionado?.deuda}
                  value={montoPago} 
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white font-mono text-2xl p-4 rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 font-bold mt-2 text-right">Deuda actual: <span className="text-red-400">${equipoSeleccionado?.deuda}</span></p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-[#141414] text-gray-400 border border-[#2E2E2E] font-bold uppercase rounded-xl hover:text-white transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} className="flex-1 py-3 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black font-black uppercase rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
                  {procesando ? "Guardando..." : "Confirmar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
