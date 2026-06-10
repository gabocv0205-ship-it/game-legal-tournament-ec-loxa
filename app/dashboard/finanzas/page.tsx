"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);

const Icons = {
  receipt: "M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2L20 4l-2-2-2 2-2-2-2 2-2-2-2 2-2-2z",
  coins: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
};

export default function LibroMayorFinanzas() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [costos, setCostos] = useState({ inscripcion: 150, arbitraje: 20, amarilla: 2, roja: 5 });
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

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
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      if (!activeId) return setLoading(false);
      setTorneoId(activeId);

      // 1. Traer Costos del Torneo
      const { data: tourney } = await supabase.from("tournaments").select("*").eq("id", activeId).single();
      const c_insc = Number(tourney?.registration_fee || 150);
      const c_arb = Number(tourney?.referee_fee || 20);
      const c_ama = Number(tourney?.yellow_card_fee || 2);
      const c_roja = Number(tourney?.red_card_fee || 5);
      
      setCostos({ inscripcion: c_insc, arbitraje: c_arb, amarilla: c_ama, roja: c_roja });

      // 2. Traer Equipos y sus Pagos
      const { data: teams } = await supabase.from("teams").select("*, payments(*)").eq("tournament_id", activeId);
      
      // 3. Traer Partidos Finalizados para el cálculo de arbitraje
      const { data: matches } = await supabase.from("matches").select("id, home_team_id, away_team_id, status").eq("tournament_id", activeId).eq("status", "finished");
      const matchIds = matches?.map(m => m.id) || [];

      // 4. Traer Eventos (Tarjetas) de los partidos finalizados
      let matchEvents: any[] = [];
      if (matchIds.length > 0) {
        const { data: events } = await supabase.from("match_events").select("*").in("match_id", matchIds);
        matchEvents = events || [];
      }

      // 5. MOTOR DE LIQUIDACIÓN: Calcular deuda real por equipo
      const calcEquipos = teams?.map(t => {
        // --- A) Calcular Pagos Realizados ---
        const pagadoTotal = t.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

        // --- B) Calcular Deuda Generada ---
        const deudaInscripcion = c_insc;
        
        // Partidos jugados por este equipo (como local o visitante)
        const partidosJugados = matches?.filter(m => m.home_team_id === t.id || m.away_team_id === t.id).length || 0;
        const deudaArbitraje = partidosJugados * c_arb;

        // Multas por tarjetas generadas por este equipo
        const amarillas = matchEvents.filter(e => e.team_id === t.id && e.event_type === 'amarilla').length;
        const rojas = matchEvents.filter(e => e.team_id === t.id && e.event_type === 'roja').length;
        const deudaMultas = (amarillas * c_ama) + (rojas * c_roja);

        // --- C) Saldo Final ---
        const totalDeudaGenerada = deudaInscripcion + deudaArbitraje + deudaMultas;
        const saldoPendiente = totalDeudaGenerada - pagadoTotal;

        return { 
          ...t, 
          partidosJugados, amarillas, rojas,
          deudaInscripcion, deudaArbitraje, deudaMultas,
          totalDeudaGenerada, pagadoTotal,
          saldoPendiente: saldoPendiente > 0 ? saldoPendiente : 0 
        };
      }) || [];

      calcEquipos.sort((a, b) => b.saldoPendiente - a.saldoPendiente);
      setEquipos(calcEquipos);

      // 6. Traer Historial para el Libro Mayor
      const { data: history } = await supabase.from("payments").select("*, teams(name)").eq("tournament_id", activeId).order("created_at", { ascending: false }).limit(20);
      setHistorial(history || []);

    } catch (error) {
      console.error("Error al cargar liquidaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalPago = (equipo: any) => {
    setEquipoSeleccionado(equipo);
    setConcepto("inscripcion");
    setMontoPago(equipo.saldoPendiente > 0 ? equipo.saldoPendiente.toString() : "");
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
        description: descripcion || `Liquidación de ${concepto}`
      }]);

      if (error) throw error;
      setMostrarModal(false);
      cargarDatos(); // Recalcular todo
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <div className="text-[#D4A017] text-center p-20 font-black animate-pulse">Auditando Liquidaciones...</div>;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-[#2E2E2E] pb-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Icon path={Icons.receipt} size={28} className="text-[#D4A017]" /> Libro Mayor de Liquidaciones
          </h2>
          <p className="text-gray-400 font-bold text-sm mt-1">Cálculo automático post-partido (Arbitrajes y Multas)</p>
        </div>
      </div>

      {/* TABLA DE LIQUIDACIÓN POR EQUIPO */}
      <div className="bg-[#1C1C1C] rounded-2xl shadow-xl border border-[#2E2E2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-400 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
              <tr>
                <th className="p-4">Club</th>
                <th className="p-4 text-center">Inscripción</th>
                <th className="p-4 text-center">Arbitrajes (Partidos)</th>
                <th className="p-4 text-center">Multas (Tarjetas)</th>
                <th className="p-4 text-center bg-red-900/10">Deuda Generada</th>
                <th className="p-4 text-center bg-green-900/10">Total Pagado</th>
                <th className="p-4 text-center font-black">Saldo Pendiente</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {equipos.map(eq => (
                <tr key={eq.id} className="hover:bg-[#141414] transition-colors">
                  <td className="p-4 font-bold flex items-center gap-3">
                    {eq.shield_url ? <Image src={eq.shield_url} alt={`Escudo de ${eq.name}`} width={24} height={24} unoptimized className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-[#2e2e2e] rounded-full"></div>}
                    {eq.name}
                  </td>
                  <td className="p-4 text-center text-gray-300 font-mono">${eq.deudaInscripcion.toFixed(2)}</td>
                  <td className="p-4 text-center text-gray-300 font-mono">
                    ${eq.deudaArbitraje.toFixed(2)} <span className="text-[9px] text-gray-500">({eq.partidosJugados} PJ)</span>
                  </td>
                  <td className="p-4 text-center text-gray-300 font-mono">
                    ${eq.deudaMultas.toFixed(2)} <span className="text-[9px] text-gray-500">({eq.amarillas}A / {eq.rojas}R)</span>
                  </td>
                  <td className="p-4 text-center text-red-400 font-mono bg-red-900/10">${eq.totalDeudaGenerada.toFixed(2)}</td>
                  <td className="p-4 text-center text-green-400 font-mono bg-green-900/10">${eq.pagadoTotal.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    {eq.saldoPendiente > 0 ? (
                      <span className="bg-red-600 text-white px-3 py-1 rounded font-black font-mono shadow-[0_0_10px_rgba(220,38,38,0.3)]">${eq.saldoPendiente.toFixed(2)}</span>
                    ) : (
                      <span className="bg-green-600 text-white px-3 py-1 rounded font-black uppercase text-[10px] tracking-widest">Al Día</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => abrirModalPago(eq)} className="bg-[#141414] hover:bg-[#D4A017] hover:text-black text-white border border-[#2E2E2E] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                      Abonar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CONTABLE (Igual que el anterior pero adaptado) */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1C1C1C] w-full max-w-md border border-[#D4A017]/50 rounded-2xl shadow-[0_0_50px_rgba(212,160,23,0.15)] overflow-hidden">
            <div className="p-6 border-b border-[#2E2E2E]">
              <h3 className="text-xl font-black text-white uppercase">Registrar Ingreso</h3>
              <p className="text-[#D4A017] font-bold text-sm">A cuenta de: {equipoSeleccionado?.name}</p>
            </div>
            <form onSubmit={registrarPago} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Concepto</label>
                <select value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:border-[#D4A017] outline-none">
                  <option value="inscripcion">Abono Inscripción</option>
                  <option value="arbitraje">Abono Arbitraje</option>
                  <option value="multa">Abono Multas</option>
                  <option value="otro">Liquidación General</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monto ($)</label>
                <input type="number" step="0.01" max={equipoSeleccionado?.saldoPendiente} value={montoPago} onChange={(e) => setMontoPago(e.target.value)} className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white font-mono text-2xl p-4 rounded-xl outline-none" required />
                <p className="text-[10px] text-gray-500 mt-2 text-right">Saldo máximo a cobrar: ${equipoSeleccionado?.saldoPendiente}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-[#141414] text-gray-400 font-bold uppercase rounded-xl">Cancelar</button>
                <button type="submit" disabled={procesando} className="flex-1 py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
