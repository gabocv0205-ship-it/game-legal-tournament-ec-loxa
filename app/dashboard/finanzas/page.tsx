"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);

const Icons = {
  receipt: "M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2L20 4l-2-2-2 2-2-2-2 2-2-2-2 2-2-2z",
  coins: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35"
};

export default function LibroMayorFinanzas() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [costos, setCostos] = useState({ inscripcion: 150, arbitraje: 20, amarilla: 2, roja: 5 });
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // KPIs
  const [stats, setStats] = useState({ totalEsperado: 0, totalRecaudado: 0, deudaInscripciones: 0 });

  // Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<any>(null);
  const [montoPago, setMontoPago] = useState("");
  const [concepto, setConcepto] = useState("inscripcion");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. AISLAMIENTO SAAS: Leer torneo seleccionado
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      if (!activeId) {
        const { data: fallback } = await supabase.from('tournaments').select('id').limit(1).single();
        if (fallback) activeId = fallback.id;
      }
      if (!activeId) return setLoading(false);
      
      setTorneoId(activeId);

      // 2. Traer configuración financiera del torneo
      const { data: tourney } = await supabase.from("tournaments").select("*").eq("id", activeId).single();
      const cuotaInscripcion = Number(tourney?.registration_fee || 150);
      setCostos({
        inscripcion: cuotaInscripcion,
        arbitraje: Number(tourney?.referee_fee || 20),
        amarilla: Number(tourney?.yellow_card_fee || 2),
        roja: Number(tourney?.red_card_fee || 5)
      });

      // 3. Traer Equipos y TODOS sus pagos
      const { data: teams } = await supabase.from("teams").select("*, payments(*)").eq("tournament_id", activeId);
      
      let sumEsperadoInscripcion = 0;
      let sumRecaudadoTotal = 0;
      let sumDeudaInscripcion = 0;

      const calcEquipos = teams?.map(t => {
        // Separar pagos por concepto
        const pagosInscripcion = t.payments?.filter((p:any) => p.concept === 'inscripcion').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
        const pagosOtros = t.payments?.filter((p:any) => p.concept !== 'inscripcion').reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
        
        const deudaIns = cuotaInscripcion - pagosInscripcion;
        
        sumEsperadoInscripcion += cuotaInscripcion;
        sumRecaudadoTotal += (pagosInscripcion + pagosOtros);
        sumDeudaInscripcion += (deudaIns > 0 ? deudaIns : 0);

        return { ...t, pagadoInscripcion: pagosInscripcion, otrosPagos: pagosOtros, deudaInscripcion: deudaIns > 0 ? deudaIns : 0 };
      }) || [];

      calcEquipos.sort((a, b) => b.deudaInscripcion - a.deudaInscripcion);
      setEquipos(calcEquipos);
      setStats({ totalEsperado: sumEsperadoInscripcion, totalRecaudado: sumRecaudadoTotal, deudaInscripciones: sumDeudaInscripcion });

      // 4. Traer Historial para el Libro Mayor
      const { data: history } = await supabase.from("payments")
        .select("*, teams(name)")
        .eq("tournament_id", activeId)
        .order("created_at", { ascending: false })
        .limit(50);
        
      setHistorial(history || []);

    } catch (error) {
      console.error("Error al cargar finanzas:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalPago = (equipo: any, conceptoSugerido = "inscripcion") => {
    setEquipoSeleccionado(equipo);
    setConcepto(conceptoSugerido);
    
    // Sugerir monto según el concepto
    if (conceptoSugerido === "inscripcion") setMontoPago(equipo.deudaInscripcion.toString());
    else if (conceptoSugerido === "arbitraje") setMontoPago(costos.arbitraje.toString());
    else if (conceptoSugerido === "multa") setMontoPago(costos.amarilla.toString());
    else setMontoPago("");
    
    setDescripcion("");
    setMostrarModal(true);
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!torneoId || !equipoSeleccionado || !montoPago || Number(montoPago) <= 0) return alert("Datos inválidos.");
    
    setProcesando(true);
    try {
      const { error } = await supabase.from("payments").insert([{
        tournament_id: torneoId,
        team_id: equipoSeleccionado.id,
        amount: Number(montoPago),
        concept: concepto,
        description: descripcion || `Pago de ${concepto}`
      }]);

      if (error) throw error;

      setMostrarModal(false);
      alert(`Recibo generado: $${montoPago} registrado a ${equipoSeleccionado.name}`);
      cargarDatos(); // Recargar todo el libro mayor
    } catch (error: any) {
      alert("Error contable: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#D4A017] font-black uppercase tracking-widest text-sm animate-pulse">Auditando Libro Mayor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#2E2E2E] pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Icon path={Icons.receipt} size={28} className="text-[#D4A017]" />
            Libro Mayor
          </h2>
          <p className="text-gray-400 font-bold text-sm mt-1">Auditoría Financiera y Recaudación</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[#1C1C1C] px-4 py-2 rounded-xl border border-[#2E2E2E] flex flex-col items-center justify-center">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Inscripción</span>
            <span className="text-white font-black text-sm">${costos.inscripcion}</span>
          </div>
          <div className="bg-[#1C1C1C] px-4 py-2 rounded-xl border border-[#2E2E2E] flex flex-col items-center justify-center">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Arbitraje</span>
            <span className="text-white font-black text-sm">${costos.arbitraje}</span>
          </div>
        </div>
      </div>

      {/* KPIs FINANCIEROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] p-6 rounded-2xl border border-[#2E2E2E] flex flex-col justify-center relative overflow-hidden">
          <h4 className="text-gray-500 font-bold text-xs uppercase tracking-widest relative z-10">Meta de Inscripciones</h4>
          <p className="text-3xl font-mono font-black text-white mt-1 relative z-10">${stats.totalEsperado}</p>
        </div>
        
        <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-[#D4A017]/50 shadow-[0_0_15px_rgba(212,160,23,0.1)] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A017]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <h4 className="text-[#D4A017] font-bold text-xs uppercase tracking-widest relative z-10">Ingresos Totales (Caja)</h4>
          <p className="text-3xl font-mono font-black text-[#D4A017] mt-1 relative z-10">${stats.totalRecaudado}</p>
        </div>

        <div className="bg-[#141414] p-6 rounded-2xl border border-red-900/50 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest relative z-10">Déficit Inscripciones</h4>
          <p className="text-3xl font-mono font-black text-red-500 mt-1 relative z-10">${stats.deudaInscripciones}</p>
        </div>
      </div>

      {/* TABLA DE CUENTAS POR EQUIPO */}
      <div className="space-y-4">
        <h3 className="text-white font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">
          Estado de Cuentas por Club
        </h3>
        <div className="bg-[#1C1C1C] rounded-2xl shadow-xl border border-[#2E2E2E] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white whitespace-nowrap">
              <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
                <tr>
                  <th className="p-4">Club Deportivo</th>
                  <th className="p-4 text-center">Estado Inscripción</th>
                  <th className="p-4 text-center">Pagado (Insc.)</th>
                  <th className="p-4 text-center">Deuda (Insc.)</th>
                  <th className="p-4 text-center">Otros Aportes</th>
                  <th className="p-4 text-right">Acción Contable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E2E2E]">
                {equipos.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic">No hay registros financieros.</td></tr>
                ) : (
                  equipos.map(eq => (
                    <tr key={eq.id} className="hover:bg-[#141414] transition-colors">
                      <td className="p-4 font-bold flex items-center gap-3">
                        {eq.shield_url ? <img src={eq.shield_url} className="w-8 h-8 object-contain" alt="Escudo" /> : <div className="w-8 h-8 bg-[#2e2e2e] rounded-full"></div>}
                        {eq.name}
                      </td>
                      <td className="p-4 text-center">
                        {eq.deudaInscripcion === 0 ? (
                          <span className="inline-block border border-green-600 text-green-500 bg-green-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Solvente</span>
                        ) : eq.pagadoInscripcion > 0 ? (
                          <span className="inline-block border border-yellow-600 text-yellow-500 bg-yellow-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Abono</span>
                        ) : (
                          <span className="inline-block border border-red-600 text-red-500 bg-red-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded animate-pulse">Moroso</span>
                        )}
                      </td>
                      <td className="p-4 text-center text-green-400 font-mono font-bold">${eq.pagadoInscripcion.toFixed(2)}</td>
                      <td className="p-4 text-center text-red-400 font-mono font-black">${eq.deudaInscripcion > 0 ? eq.deudaInscripcion.toFixed(2) : "0.00"}</td>
                      <td className="p-4 text-center text-gray-400 font-mono">${eq.otrosPagos.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => abrirModalPago(eq, eq.deudaInscripcion > 0 ? "inscripcion" : "arbitraje")} className="bg-[#141414] hover:bg-[#D4A017] hover:text-black text-white border border-[#2E2E2E] hover:border-transparent px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all">
                          Facturar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LIBRO MAYOR (HISTORIAL DE TRANSACCIONES) */}
      <div className="space-y-4 pt-6">
        <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-2">
          Historial de Ingresos Recientes
        </h3>
        <div className="bg-[#1C1C1C] rounded-2xl shadow-xl border border-[#2E2E2E] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white whitespace-nowrap">
              <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
                <tr>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Club Emisor</th>
                  <th className="p-4">Concepto</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4 text-right">Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E2E2E]">
                {historial.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500 italic">El libro mayor está en blanco.</td></tr>
                ) : (
                  historial.map(transaccion => (
                    <tr key={transaccion.id} className="hover:bg-[#141414] transition-colors">
                      <td className="p-4 text-gray-400 font-mono text-xs">
                        {new Date(transaccion.created_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 font-bold">{transaccion.teams?.name}</td>
                      <td className="p-4">
                        <span className="bg-[#2E2E2E] text-gray-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                          {transaccion.concept}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-xs truncate max-w-[200px]">{transaccion.description}</td>
                      <td className="p-4 text-right text-green-400 font-mono font-black">+ ${Number(transaccion.amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CONTABLE */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1C1C1C] w-full max-w-md border border-[#D4A017]/50 rounded-2xl shadow-[0_0_50px_rgba(212,160,23,0.15)] overflow-hidden">
            <div className="p-6 border-b border-[#2E2E2E]">
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Icon path={Icons.coins} size={20} className="text-[#D4A017]" />
                Registrar Ingreso
              </h3>
              <p className="text-[#D4A017] font-bold text-sm mt-1">A cuenta de: {equipoSeleccionado?.name}</p>
            </div>
            
            <form onSubmit={registrarPago} className="p-6 space-y-5">
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Concepto del Pago</label>
                <select 
                  value={concepto}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConcepto(val);
                    if (val === "inscripcion") setMontoPago(equipoSeleccionado?.deudaInscripcion.toString());
                    else if (val === "arbitraje") setMontoPago(costos.arbitraje.toString());
                    else if (val === "multa") setMontoPago(costos.amarilla.toString());
                  }}
                  className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors cursor-pointer"
                >
                  <option value="inscripcion">Inscripción del Torneo</option>
                  <option value="arbitraje">Pago de Arbitraje</option>
                  <option value="multa">Pago de Multa (Tarjetas)</option>
                  <option value="otro">Otro Concepto</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monto ($)</label>
                <input 
                  type="number" step="0.01" min="0.01" value={montoPago} 
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white font-mono text-2xl p-4 rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors"
                  placeholder="0.00" required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descripción / Nota (Opcional)</label>
                <input 
                  type="text" value={descripcion} 
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors text-sm"
                  placeholder="Ej: Pago de arbitraje Fecha 3"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#2E2E2E]">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-[#141414] text-gray-400 border border-[#2E2E2E] font-bold uppercase tracking-widest rounded-xl hover:text-white transition-all text-xs">
                  Cancelar
                </button>
                <button type="submit" disabled={procesando} className="flex-1 py-3 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] transition-transform text-xs">
                  {procesando ? "Procesando..." : "Asentar en Libro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
