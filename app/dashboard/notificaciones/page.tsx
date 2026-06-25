"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearActiveTournament, getAccessibleTournament } from "@/lib/tenantAccess";
import { playAudioEffect } from "@/lib/audioExperience";

const TIPOS = [
  "Horarios de partidos",
  "Cambios de programacion",
  "Suspensiones",
  "Sanciones",
  "Comunicados generales",
  "Novedades del campeonato",
];

export default function NotificacionesPage() {
  const [torneoId, setTorneoId] = useState<string | null>(null);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const activeId = typeof window !== "undefined" ? localStorage.getItem("activeTournamentId") : null;
    if (!activeId) {
      setLoading(false);
      return;
    }
    const tournament = await getAccessibleTournament(supabase, activeId, "id, name");
    if (!tournament) {
      clearActiveTournament();
      setLoading(false);
      return;
    }
    setTorneoId(activeId);
    const [teamsResult, logsResult] = await Promise.all([
      supabase.from("teams").select("id, name, manager_name, manager_phone, manager_country_code").eq("tournament_id", activeId).order("name"),
      supabase.from("notification_logs").select("*").eq("tournament_id", activeId).order("created_at", { ascending: false }).limit(30),
    ]);
    setEquipos(teamsResult.data || []);
    setHistorial(logsResult.data || []);
    setLoading(false);
  };

  const equiposSeleccionados = useMemo(() => equipos.filter(eq => seleccionados.includes(eq.id)), [equipos, seleccionados]);

  const toggleEquipo = (id: string) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const normalizarTelefono = (telefono: string) => {
    const digits = String(telefono || "").replace(/\D/g, "");
    if (digits.startsWith("593")) return digits;
    if (digits.startsWith("0")) return `593${digits.slice(1)}`;
    return `593${digits}`;
  };

  const esErrorSchemaCache = (error: any) => {
    const message = String(error?.message || "").toLowerCase();
    return error?.code === "PGRST204" || message.includes("schema cache") || message.includes("could not find");
  };

  const guardarHistorial = async (logs: any[]) => {
    const legacyLogs = logs.map(({ recipient_phone, message_body, ...log }) => ({
      ...log,
      phone: log.phone || recipient_phone,
      message: log.message || message_body,
    }));

    const canonicalLogs = logs.map(({ phone, message, ...log }) => ({
      ...log,
      recipient_phone: log.recipient_phone || phone,
      message_body: log.message_body || message,
    }));

    const attempts = [logs, legacyLogs, canonicalLogs];
    let lastError: any = null;

    for (const payload of attempts) {
      const { error } = await supabase.from("notification_logs").insert(payload);
      if (!error) return null;
      lastError = error;
      if (!esErrorSchemaCache(error)) return error;
    }

    return lastError;
  };

  const enviar = async () => {
    if (!torneoId) return alert("Selecciona primero un torneo.");
    if (equiposSeleccionados.length === 0) return alert("Selecciona al menos un dirigente.");
    if (!mensaje.trim()) return alert("Escribe el mensaje a enviar.");

    await playAudioEffect("notification");
    const logs = equiposSeleccionados.map(eq => ({
      tournament_id: torneoId,
      team_id: eq.id,
      recipient_name: eq.manager_name || eq.name,
      recipient_phone: normalizarTelefono(eq.manager_phone),
      country_code: eq.manager_country_code || "+593",
      phone: normalizarTelefono(eq.manager_phone),
      channel: "whatsapp",
      message_type: tipo,
      message_body: mensaje.trim(),
      message: mensaje.trim(),
      status: "prepared",
      sent_at: new Date().toISOString(),
    }));

    const error = await guardarHistorial(logs);
    if (error) {
      console.error("Error al guardar historial de notificaciones:", error);
      return alert(`No se pudo guardar el historial de WhatsApp. Detalle tecnico: ${error.message}`);
    }

    const primero = logs[0];
    const url = `https://wa.me/${primero.recipient_phone}?text=${encodeURIComponent(mensaje.trim())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    await cargarDatos();
    alert(equiposSeleccionados.length === 1 ? "Mensaje preparado en WhatsApp." : "Historial guardado. Se abrió WhatsApp para el primer dirigente; repite el envío individual para evitar bloqueos del navegador.");
  };

  if (loading) return <div className="text-[#D4A017] text-center p-20 font-black animate-pulse">Preparando centro de notificaciones...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-white uppercase tracking-wider">Notificaciones a Dirigentes</h2>
        <p className="text-gray-400 text-sm">Plantillas y registro de comunicaciones por WhatsApp. Ecuador (+593) por defecto.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tipo de mensaje</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="mt-2 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-3 text-white">
                {TIPOS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <button onClick={() => setSeleccionados(equipos.filter(eq => eq.manager_phone).map(eq => eq.id))} className="self-end rounded-xl border border-[#D4A017]/50 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#D4A017] hover:bg-[#D4A017] hover:text-black">
              Seleccionar todos con celular
            </button>
          </div>
          <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={5} className="mt-4 w-full rounded-xl border border-[#2E2E2E] bg-[#0a0a0a] p-4 text-white outline-none focus:border-[#D4A017]" placeholder="Escribe el comunicado para los dirigentes..." />
          <button onClick={enviar} className="mt-4 w-full rounded-xl bg-[#D4A017] px-5 py-3 text-sm font-black uppercase tracking-widest text-black hover:bg-yellow-400">Preparar envío por WhatsApp</button>
        </div>

        <div className="rounded-2xl border border-[#2E2E2E] bg-[#141414] p-6">
          <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-[#D4A017]">Dirigentes</h3>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {equipos.map(eq => (
              <label key={eq.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${seleccionados.includes(eq.id) ? "border-[#D4A017] bg-[#D4A017]/10" : "border-[#2E2E2E] bg-[#0a0a0a]"}`}>
                <input type="checkbox" checked={seleccionados.includes(eq.id)} onChange={() => toggleEquipo(eq.id)} disabled={!eq.manager_phone} className="accent-[#D4A017]" />
                <span className="flex-1">
                  <span className="block text-sm font-black uppercase text-white">{eq.name}</span>
                  <span className="block text-xs text-gray-400">{eq.manager_name || "Sin dirigente"} · {eq.manager_phone || "Sin celular"}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#2E2E2E] bg-[#1C1C1C]">
        <h3 className="border-b border-[#2E2E2E] p-4 text-xs font-black uppercase tracking-widest text-[#D4A017]">Historial de envíos</h3>
        {historial.length === 0 ? <p className="p-6 text-sm text-gray-500">Aún no existen comunicaciones registradas.</p> : historial.map(item => (
          <div key={item.id} className="grid grid-cols-1 gap-2 border-b border-[#2E2E2E] p-4 text-xs md:grid-cols-5">
            <span className="font-bold text-white">{item.recipient_name}</span>
            <span className="text-gray-400">{item.recipient_phone || item.phone}</span>
            <span className="text-[#D4A017]">{item.message_type}</span>
            <span className="text-gray-400">{item.status}</span>
            <span className="text-gray-500">{new Date(item.created_at).toLocaleString("es-EC")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
