"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";
import { FinanceExportRow, exportFinanceCsv, exportFinancePdf, exportFinanceXlsx } from "@/lib/exportUtils";

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
  const [historialLibro, setHistorialLibro] = useState<any[]>([]);
  const [costos, setCostos] = useState({ inscripcion: 150, arbitraje: 20, amarilla: 2, roja: 5 });
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<any>(null);
  const [montoPago, setMontoPago] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState<"pago" | "descuento">("pago");
  const [concepto, setConcepto] = useState("inscripcion");
  const [descripcion, setDescripcion] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [detallePagos, setDetallePagos] = useState<any[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [exportDesde, setExportDesde] = useState("");
  const [exportHasta, setExportHasta] = useState("");
  const [historialExportaciones, setHistorialExportaciones] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      let activeId = typeof window !== 'undefined' ? localStorage.getItem('activeTournamentId') : null;
      if (!activeId) return setLoading(false);

      const tourney = await getAccessibleTournament(supabase, activeId);
      if (!tourney) {
        clearActiveTournament();
        setEquipos([]);
        setHistorial([]);
        setHistorialLibro([]);
        setTorneoId(null);
        return setLoading(false);
      }

      setTorneoId(activeId);

      // 1. Traer Costos del Torneo
      const c_insc = Number(tourney?.registration_fee || 150);
      const c_arb = Number(tourney?.referee_fee || 20);
      const c_ama = Number(tourney?.yellow_card_fee || 2);
      const c_roja = Number(tourney?.red_card_fee || 5);
      
      setCostos({ inscripcion: c_insc, arbitraje: c_arb, amarilla: c_ama, roja: c_roja });

      // 2. Traer Equipos y sus Pagos
      const { data: teams } = await supabase.from("teams").select("*, payments(*)").eq("tournament_id", activeId);
      const { data: ledger } = await supabase.from("financial_ledger").select("*").eq("tournament_id", activeId).order("created_at", { ascending: false });
      setHistorialLibro(ledger || []);
      const { data: exports } = await supabase.from("financial_exports").select("*").eq("tournament_id", activeId).order("created_at", { ascending: false }).limit(12);
      setHistorialExportaciones(exports || []);
      
      // 3. Traer Partidos Finalizados para el cálculo de arbitraje
      const { data: allMatches } = await supabase.from("matches").select("id, home_team_id, away_team_id, status").eq("tournament_id", activeId);
      const matches = (allMatches || []).filter(match => match.status === "finished");
      const matchIds = matches.map(m => m.id) || [];

      // 4. Traer Eventos (Tarjetas) de los partidos finalizados
      let matchEvents: any[] = [];
      if (matchIds.length > 0) {
        const { data: events } = await supabase.from("match_events").select("*").in("match_id", matchIds);
        matchEvents = events || [];
      }

      // 5. MOTOR DE LIQUIDACIÓN: Calcular deuda real por equipo
      const calcEquipos = teams?.map(t => {
        // --- A) Calcular Pagos Realizados ---
        const movimientos = (ledger || []).filter(entry => entry.team_id === t.id);
        const pagosEquipo = t.payments || [];
        const tieneLibro = movimientos.length > 0;
        const normalizar = (value: any) => String(value || "").toLowerCase().trim();
        const esDescuento = (entry: any) =>
          normalizar(entry.category || entry.concept).includes("descuento") ||
          normalizar(entry.payment_method).includes("descuento") ||
          normalizar(entry.reference_type).includes("descuento") ||
          normalizar(entry.reference_type).includes("discount");
        const montoFirmado = (entry: any) => (entry.entry_type === "reversal" ? -1 : 1) * Number(entry.amount || 0);
        const cargosNetos = (categorias: string[]) => movimientos
          .filter(entry => ["charge", "adjustment"].includes(entry.entry_type) && categorias.includes(entry.category))
          .reduce((sum, entry) => sum + (entry.entry_type === "adjustment" ? -1 : 1) * Number(entry.amount), 0);
        const ledgerPaymentReferenceIds = new Set(
          movimientos
            .filter(entry => ["payment", "reversal"].includes(entry.entry_type) && entry.reference_type === "payments")
            .map(entry => normalizar(String(entry.reference_id || "").replace(":deleted", "")))
        );
        const pagosLibro = movimientos
          .filter(entry => ["payment", "reversal"].includes(entry.entry_type) && !esDescuento(entry))
          .reduce((sum, entry) => sum + montoFirmado(entry), 0);
        const pagosSinLibro = pagosEquipo
          .filter((p: any) => !esDescuento(p) && !ledgerPaymentReferenceIds.has(normalizar(p.id)))
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const descuentosLibro = movimientos
          .filter(entry => ["payment", "reversal", "adjustment"].includes(entry.entry_type) && esDescuento(entry))
          .reduce((sum, entry) => sum + montoFirmado(entry), 0);
        const descuentosSinLibro = pagosEquipo
          .filter((p: any) => esDescuento(p) && !ledgerPaymentReferenceIds.has(normalizar(p.id)))
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const pagadoTotal = Math.max(0, pagosLibro + pagosSinLibro);
        const descuentoTotal = Math.max(0, descuentosLibro + descuentosSinLibro);
        const descuentoLegacy = Math.max(0, descuentosSinLibro);

        // --- B) Calcular Deuda Generada ---
        const deudaInscripcion = tieneLibro ? cargosNetos(["inscripcion"]) : c_insc;
        
        // Partidos jugados por este equipo (como local o visitante)
        const partidosJugados = matches?.filter(m => m.home_team_id === t.id || m.away_team_id === t.id).length || 0;
        const partidosProgramados = (allMatches || []).filter(m => m.status !== "finished" && (m.home_team_id === t.id || m.away_team_id === t.id)).length;
        const deudaArbitraje = tieneLibro ? cargosNetos(["arbitraje"]) : partidosJugados * c_arb;

        // Multas por tarjetas generadas por este equipo
        const amarillas = matchEvents.filter(e => e.team_id === t.id && e.event_type === 'amarilla').length;
        const rojas = matchEvents.filter(e => e.team_id === t.id && e.event_type === 'roja').length;
        const deudaMultas = tieneLibro ? cargosNetos(["amarilla", "roja"]) : (amarillas * c_ama) + (rojas * c_roja);

        // --- C) Saldo Final ---
        const totalDeudaGenerada = deudaInscripcion + deudaArbitraje + deudaMultas;
        const saldoPendiente = totalDeudaGenerada - pagadoTotal - descuentoLegacy;

        return { 
          ...t, 
          partidosJugados, partidosProgramados, amarillas, rojas,
          deudaInscripcion, deudaArbitraje, deudaMultas,
          totalDeudaGenerada, pagadoTotal, descuentoTotal,
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

  const abrirModalPago = (equipo: any, tipo: "pago" | "descuento" = "pago") => {
    setEquipoSeleccionado(equipo);
    setTipoMovimiento(tipo);
    setConcepto("inscripcion");
    setMontoPago(tipo === "descuento" ? "" : (equipo.saldoPendiente > 0 ? equipo.saldoPendiente.toString() : ""));
    setDescripcion(tipo === "descuento" ? "Descuento aplicado al concepto seleccionado." : "");
    setMetodoPago("efectivo");
    setMostrarModal(true);
  };

  const abrirDetalleEquipo = async (equipo: any) => {
    setEquipoSeleccionado(equipo);
    setMostrarDetalle(true);
    setCargandoDetalle(true);
    const { data } = await supabase.from("payments").select("*").eq("tournament_id", torneoId).eq("team_id", equipo.id).order("created_at", { ascending: false });
    setDetallePagos(data || []);
    setCargandoDetalle(false);
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(montoPago);
    if (!torneoId || !equipoSeleccionado || !montoPago || !Number.isFinite(monto) || monto <= 0) {
      return alert("Ingresa un valor mayor a cero.");
    }

    setProcesando(true);
    try {
      const { error } = tipoMovimiento === "descuento"
        ? await supabase.rpc("register_financial_discount", {
            p_tournament_id: torneoId,
            p_team_id: equipoSeleccionado.id,
            p_category: concepto,
            p_amount: monto,
            p_description: descripcion || `Descuento de ${concepto}`
          })
        : await supabase.from("payments").insert([{
            tournament_id: torneoId,
            team_id: equipoSeleccionado.id,
            amount: monto,
            concept: concepto,
            payment_method: metodoPago,
            notes: descripcion || null,
            description: descripcion || `Liquidacion de ${concepto}`
          }]);

      if (error) throw error;
      setMostrarModal(false);
      cargarDatos();
    } catch (error: any) {
      alert(`No se pudo registrar el ${tipoMovimiento}: ${error?.message || "error desconocido"}`);
    } finally {
      setProcesando(false);
    }
  };

  const construirFilasExportacion = (): FinanceExportRow[] => {
    const desde = exportDesde ? new Date(`${exportDesde}T00:00:00`) : null;
    const hasta = exportHasta ? new Date(`${exportHasta}T23:59:59`) : null;
    const nombreEquipo = (teamId: string) => equipos.find(eq => eq.id === teamId)?.name || "Sin equipo";
    let saldo = 0;

    const base = historialLibro.length > 0
      ? historialLibro.map(entry => {
          const amount = Number(entry.amount || 0);
          const referenceType = String(entry.reference_type || "").toLowerCase();
          const esDescuento = String(entry.category || "").startsWith("descuento") || referenceType === "descuento" || referenceType === "discount";
          const ingreso = entry.entry_type === "payment" && !esDescuento ? amount : 0;
          const egreso = entry.entry_type === "reversal" ? amount : ["charge", "adjustment"].includes(entry.entry_type) || esDescuento ? amount : 0;
          saldo += ingreso - egreso;
          return {
            fecha: entry.created_at,
            equipo: nombreEquipo(entry.team_id),
            tipo: esDescuento ? "discount" : entry.entry_type || "movimiento",
            categoria: entry.category || entry.entry_type,
            metodo: entry.reference_type || "libro",
            ingreso,
            egreso,
            saldo,
            descripcion: entry.description || "",
          };
        })
      : historial.map(pago => {
          const amount = Number(pago.amount || 0);
          const esDescuento = String(pago.concept || "").startsWith("descuento") || pago.payment_method === "descuento";
          saldo += esDescuento ? -amount : amount;
          return {
            fecha: pago.created_at,
            equipo: pago.teams?.name || "Sin equipo",
            tipo: esDescuento ? "discount" : "payment",
            categoria: pago.concept || "pago",
            metodo: pago.payment_method || "",
            ingreso: esDescuento ? 0 : amount,
            egreso: esDescuento ? amount : 0,
            saldo,
            descripcion: pago.description || pago.notes || "",
          };
        });

    return base.filter(row => {
      const fecha = new Date(row.fecha);
      return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
    });
  };

  const registrarExportacion = async (tipo: string, filas: FinanceExportRow[]) => {
    if (!torneoId) return;
    await supabase.from("financial_exports").insert([{
      tournament_id: torneoId,
      export_type: tipo,
      date_from: exportDesde || null,
      date_to: exportHasta || null,
      row_count: filas.length,
    }]);
    const { data } = await supabase.from("financial_exports").select("*").eq("tournament_id", torneoId).order("created_at", { ascending: false }).limit(12);
    setHistorialExportaciones(data || []);
  };

  const exportarFinanzas = async (tipo: "csv" | "xlsx" | "pdf") => {
    const filas = construirFilasExportacion();
    if (!filas.length) return alert("No existen movimientos para exportar con esos filtros.");
    const filename = `finanzas-${torneoId}-${new Date().toISOString().slice(0, 10)}`;
    if (tipo === "csv") exportFinanceCsv(filas, `${filename}.csv`);
    if (tipo === "xlsx") exportFinanceXlsx(filas, `${filename}.xlsx`);
    if (tipo === "pdf") exportFinancePdf(filas, `${filename}.pdf`, "Reporte financiero GAME LEGAL");
    await registrarExportacion(tipo, filas);
  };

  if (loading) return <div className="text-[#D4A017] text-center p-20 font-black animate-pulse">Auditando Liquidaciones...</div>;
  const equiposFiltrados = equipos.filter(equipo => !filtroEstado || (filtroEstado === "aldia" ? equipo.saldoPendiente === 0 : filtroEstado === "parcial" ? equipo.saldoPendiente > 0 && equipo.pagadoTotal > 0 : equipo.saldoPendiente > 0 && equipo.pagadoTotal === 0));

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#141414] border border-[#2E2E2E] p-4 rounded-xl">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="bg-[#0a0a0a] text-white border border-[#2E2E2E] p-3 rounded-lg"><option value="">Todos los estados</option><option value="aldia">Al día</option><option value="parcial">Pago parcial</option><option value="mora">En mora</option></select>
        <select value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)} className="bg-[#0a0a0a] text-white border border-[#2E2E2E] p-3 rounded-lg"><option value="">Todos los métodos</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="deposito">Depósito</option><option value="descuento">Descuento / compensacion</option><option value="otro">Otro</option></select>
        <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="bg-[#0a0a0a] text-white border border-[#2E2E2E] p-3 rounded-lg" style={{ colorScheme: 'dark' }} />
      </div>

      <div className="rounded-2xl border border-[#D4A017]/35 bg-[#141414] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)} className="rounded-lg border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white" style={{ colorScheme: "dark" }} />
          <input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)} className="rounded-lg border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white" style={{ colorScheme: "dark" }} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportarFinanzas("csv")} className="rounded-lg bg-[#1C1C1C] px-4 py-3 text-xs font-black uppercase tracking-widest text-white border border-[#2E2E2E] hover:border-[#D4A017]">CSV</button>
            <button onClick={() => exportarFinanzas("xlsx")} className="rounded-lg bg-[#1C1C1C] px-4 py-3 text-xs font-black uppercase tracking-widest text-white border border-[#2E2E2E] hover:border-[#D4A017]">Excel</button>
            <button onClick={() => exportarFinanzas("pdf")} className="rounded-lg bg-[#D4A017] px-4 py-3 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-400">PDF</button>
          </div>
        </div>
        {historialExportaciones.length > 0 && (
          <div className="mt-4 border-t border-[#2E2E2E] pt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#D4A017]">Historial de exportaciones</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {historialExportaciones.slice(0, 6).map(item => (
                <div key={item.id} className="rounded-lg border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-xs">
                  <span className="font-black uppercase text-white">{item.export_type}</span>
                  <span className="ml-2 text-gray-500">{item.row_count} filas</span>
                  <p className="mt-1 text-gray-500">{new Date(item.created_at).toLocaleString("es-EC")}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
                <th className="p-4 text-center bg-emerald-900/10">Descuentos</th>
                <th className="p-4 text-center font-black">Saldo Pendiente</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {equiposFiltrados.map(eq => (
                <tr key={eq.id} className="hover:bg-[#141414] transition-colors cursor-pointer" onClick={() => abrirDetalleEquipo(eq)}>
                  <td className="p-4 font-bold flex items-center gap-3">
                    {eq.shield_url ? <Image src={eq.shield_url} alt={`Escudo de ${eq.name}`} width={24} height={24} unoptimized className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-[#2e2e2e] rounded-full"></div>}
                    {eq.name}
                  </td>
                  <td className="p-4 text-center text-gray-300 font-mono">${eq.deudaInscripcion.toFixed(2)}</td>
                  <td className="p-4 text-center text-gray-300 font-mono">
                    ${eq.deudaArbitraje.toFixed(2)} <span className="text-[9px] text-gray-500">({eq.partidosJugados} jugados / {eq.partidosProgramados} prog.)</span>
                  </td>
                  <td className="p-4 text-center text-gray-300 font-mono">
                    ${eq.deudaMultas.toFixed(2)} <span className="text-[9px] text-gray-500">({eq.amarillas}A / {eq.rojas}R)</span>
                  </td>
                  <td className="p-4 text-center text-red-400 font-mono bg-red-900/10">${eq.totalDeudaGenerada.toFixed(2)}</td>
                  <td className="p-4 text-center text-green-400 font-mono bg-green-900/10">${eq.pagadoTotal.toFixed(2)}</td>
                  <td className="p-4 text-center text-emerald-300 font-mono bg-emerald-900/10">${Number(eq.descuentoTotal || 0).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    {eq.saldoPendiente > 0 ? (
                      <span className={`${eq.pagadoTotal > 0 ? 'bg-yellow-600' : 'bg-red-600'} text-white px-3 py-1 rounded font-black font-mono`}>${eq.saldoPendiente.toFixed(2)} · {eq.pagadoTotal > 0 ? 'Parcial' : 'En mora'}</span>
                    ) : (
                      <span className="bg-green-600 text-white px-3 py-1 rounded font-black uppercase text-[10px] tracking-widest">Al Día</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={(event) => { event.stopPropagation(); abrirModalPago(eq, "descuento"); }} className="bg-emerald-950 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-700 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                        Descuento
                      </button>
                      <button onClick={(event) => { event.stopPropagation(); abrirModalPago(eq); }} className="bg-[#141414] hover:bg-[#D4A017] hover:text-black text-white border border-[#2E2E2E] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                        Abonar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden">
        <h3 className="p-4 text-[#D4A017] font-black uppercase text-xs tracking-widest border-b border-[#2E2E2E]">Últimos pagos registrados</h3>
        {historial.filter(pago => (!filtroMetodo || pago.payment_method === filtroMetodo) && (!filtroFecha || String(pago.created_at).startsWith(filtroFecha))).map(pago => (
          <div key={pago.id} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 border-b border-[#2E2E2E] text-xs">
            <span className="text-white font-bold">{pago.teams?.name}</span><span className="text-green-400">${Number(pago.amount).toFixed(2)}</span><span className="text-[#D4A017] uppercase">{pago.payment_method || 'No especificado'}</span><span className="text-gray-400">{pago.description || pago.notes || '-'}</span><span className="text-gray-500">{new Date(pago.created_at).toLocaleString('es-EC')}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] overflow-hidden">
        <h3 className="p-4 text-[#D4A017] font-black uppercase text-xs tracking-widest border-b border-[#2E2E2E]">Libro transaccional auditable</h3>
        {historialLibro.length === 0 ? <p className="p-6 text-gray-500 text-sm">Se activará al ejecutar production_hardening.sql en Supabase.</p> : historialLibro.slice(0, 30).map(entry => (
          <div key={entry.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 p-4 border-b border-[#2E2E2E] text-xs">
            <span className={`font-black uppercase ${entry.entry_type === "payment" ? "text-green-400" : entry.entry_type === "reversal" ? "text-red-400" : "text-[#D4A017]"}`}>{entry.entry_type}</span>
            <span className="text-white uppercase">{entry.category}</span>
            <span className="text-white font-mono">${Number(entry.amount).toFixed(2)}</span>
            <span className="text-gray-400">{entry.description || "-"}</span>
            <span className="text-gray-500">{entry.reference_type}</span>
            <span className="text-gray-500">{new Date(entry.created_at).toLocaleString("es-EC")}</span>
          </div>
        ))}
      </div>

      {mostrarDetalle && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <aside className="w-full max-w-lg h-full bg-[#141414] border-l border-[#D4A017]/40 p-6 overflow-y-auto shadow-2xl">
            <div className="flex justify-between border-b border-[#2E2E2E] pb-4 mb-5">
              <div><h3 className="text-xl font-black text-white uppercase">{equipoSeleccionado?.name}</h3><p className="text-xs text-gray-500">Detalle financiero bajo demanda</p></div>
              <button onClick={() => setMostrarDetalle(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Summary label="Total" value={equipoSeleccionado?.totalDeudaGenerada} color="text-white" />
              <Summary label="Cancelado" value={equipoSeleccionado?.pagadoTotal} color="text-green-400" />
              <Summary label="Descuento" value={equipoSeleccionado?.descuentoTotal} color="text-emerald-300" />
              <Summary label="Pendiente" value={equipoSeleccionado?.saldoPendiente} color="text-red-400" />
            </div>
            <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2">
              <button onClick={() => { setMostrarDetalle(false); abrirModalPago(equipoSeleccionado); }} className="py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl">Registrar nuevo pago</button>
              <button onClick={() => { setMostrarDetalle(false); abrirModalPago(equipoSeleccionado, "descuento"); }} className="py-3 bg-[#1C1C1C] border border-[#D4A017]/40 text-[#D4A017] font-black uppercase rounded-xl">Aplicar descuento</button>
            </div>
            {cargandoDetalle ? <p className="text-gray-500">Cargando historial...</p> : detallePagos.length === 0 ? <p className="text-gray-500">No existen pagos registrados.</p> : detallePagos.map(pago => (
              <div key={pago.id} className="mb-3 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-4">
                <div className="flex justify-between"><span className="text-white font-bold">${Number(pago.amount).toFixed(2)}</span><span className="text-gray-500 text-xs">{new Date(pago.created_at).toLocaleString('es-EC')}</span></div>
                <p className="text-[#D4A017] text-xs uppercase mt-2">{pago.payment_method || 'No especificado'} · {pago.concept}</p>
                {(pago.notes || pago.description) && <p className="text-gray-400 text-xs mt-1">{pago.notes || pago.description}</p>}
              </div>
            ))}
          </aside>
        </div>
      )}

      {/* MODAL CONTABLE */}
      {mostrarModal && (
        <div className="finance-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="finance-modal-panel gl-finance-modal bg-[#1C1C1C] w-full max-w-md border border-[#D4A017]/50 rounded-2xl shadow-[0_0_50px_rgba(212,160,23,0.15)] overflow-hidden">
            <div className="p-6 border-b border-[#2E2E2E]">
              <h3 className="text-xl font-black text-white uppercase">{tipoMovimiento === "descuento" ? "Registrar Descuento" : "Registrar Ingreso"}</h3>
              <p className="text-[#D4A017] font-bold text-sm">A cuenta de: {equipoSeleccionado?.name}</p>
            </div>
            <form onSubmit={registrarPago} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Concepto</label>
                <select value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:border-[#D4A017] outline-none">
                  {tipoMovimiento === "descuento" ? (
                    <>
                      <option value="inscripcion">Descuento Inscripcion</option>
                      <option value="arbitraje">Descuento Arbitraje</option>
                      <option value="amarilla">Descuento Multa Amarilla</option>
                      <option value="roja">Descuento Multa Roja</option>
                    </>
                  ) : (
                    <>
                      <option value="inscripcion">Abono Inscripcion</option>
                      <option value="arbitraje">Abono Arbitraje</option>
                      <option value="multa">Abono Multas</option>
                      <option value="otro">Liquidacion General</option>
                    </>
                  )}
                </select>
              </div>
              {tipoMovimiento === "pago" && (
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metodo de pago</label>
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl">
                    <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="deposito">Deposito</option><option value="otro">Otro</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Observaciones</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{tipoMovimiento === "descuento" ? "Valor del descuento ($)" : "Monto ($)"}</label>
                <input type="number" step="0.01" min="0.01" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white font-mono text-2xl p-4 rounded-xl outline-none" required />
                <p className="text-[10px] text-gray-500 mt-2 text-right">
                  {tipoMovimiento === "descuento"
                    ? "El descuento se resta del concepto seleccionado."
                    : `Saldo maximo a cobrar: $${Number(equipoSeleccionado?.saldoPendiente || 0).toFixed(2)}`}
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-[#141414] text-gray-400 font-bold uppercase rounded-xl">Cancelar</button>
                <button type="submit" disabled={procesando} className="flex-1 py-3 bg-[#D4A017] text-black font-black uppercase rounded-xl disabled:opacity-60">{procesando ? "Registrando..." : tipoMovimiento === "descuento" ? "Aplicar descuento" : "Registrar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, color }: any) {
  return <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl p-3"><p className="text-[9px] text-gray-500 uppercase font-bold">{label}</p><p className={`font-mono font-black ${color}`}>${Number(value || 0).toFixed(2)}</p></div>;
}
