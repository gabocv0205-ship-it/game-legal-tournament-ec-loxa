"use client";
import React, { useState } from "react";
import { 
  Trophy, Users, Calendar, DollarSign, Settings, Shield, 
  Plus, Edit2, CheckCircle, AlertCircle, FileText, Download, 
  Search, Lock, Image as ImageIcon, CreditCard 
} from "lucide-react";

// ============================================================
// DATOS MAESTROS (Estructura adaptada para Supabase)
// ============================================================
const INITIAL_TOURNAMENTS = [
  {
    id: "t1", name: "Copa GAME-LEGAL 2026", season: "2026",
    status: "active", teams: 16, format: "groups", // 'league' | 'groups'
    branding: { logo: "🏆", color: "#1e3a8a", banner: "" },
    registration_fee: 150.00, start_date: "2026-06-01", end_date: "2026-08-30",
  },
];

const INITIAL_TEAMS = [
  { id: "tm1", name: "FC Celtic Loja", logo: "🍀", group: "A", seed: true },
  { id: "tm2", name: "Sporting Cristal", logo: "💎", group: "A", seed: false },
  { id: "tm3", name: "Atlético Sur", logo: "🦅", group: "B", seed: true },
];

const INITIAL_PLAYERS = [
  { id: "p1", team_id: "tm1", cedula: "1104567890", name: "Carlos Ruiz", position: "Delantero", doc_type: "Cédula", goals: 5, yellow: 1, red: 0, suspended: false },
  { id: "p2", team_id: "tm2", cedula: "1109876543", name: "Juan Pérez", position: "Defensa", doc_type: "Cédula", goals: 0, yellow: 3, red: 0, suspended: true },
];

const INITIAL_MATCHES = [
  { id: "m1", round: "Jornada 1", home_id: "tm1", away_id: "tm2", date: "2026-06-06", time: "10:00", venue: "Cancha Principal", status: "scheduled", home_score: null, away_score: null },
];

const INITIAL_FINANCES = [
  { id: "f1", team_id: "tm1", concept: "Inscripción", type: "income", amount: 150.00, paid: 150.00, status: "pagado", method: "Transferencia", date: "2026-05-01" },
  { id: "f2", team_id: "tm2", concept: "Inscripción", type: "income", amount: 150.00, paid: 50.00, status: "parcial", method: "Efectivo", date: "2026-05-05" },
  { id: "f3", team_id: "tm3", concept: "Inscripción", type: "income", amount: 150.00, paid: 0, status: "pendiente", method: null, date: null },
];

// ============================================================
// UTILIDADES (Moneda USD Ecuador)
// ============================================================
const fmtUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "-";

// ============================================================
// COMPONENTES UI REUTILIZABLES
// ============================================================
const Badge = ({ label, color = "blue" }: { label: string, color?: string }) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800", green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800", yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800", gray: "bg-gray-100 text-gray-800"
  };
  return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${colors[color] || colors.gray}`}>{label}</span>;
};

const Modal = ({ open, onClose, title, children, wide = false }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-4xl" : "max-w-xl"} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <Settings size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
};

// ============================================================
// VISTAS PRINCIPALES
// ============================================================

// --- 1. CONFIGURACIÓN DEL TORNEO (Formato y Personalización) ---
const TournamentSettingsView = ({ tournament }: { tournament: typeof INITIAL_TOURNAMENTS[0] }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-black text-gray-900">Configuración del Torneo</h2>
      <p className="text-sm text-gray-500">Adapta el campeonato a tus reglas e identidad visual.</p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Formato de Competición */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Trophy size={18} className="text-blue-600"/> Formato de Competición</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Estructura</label>
            <select className="w-full border rounded-xl p-2.5 text-sm bg-gray-50">
              <option value="groups">Mundial FIFA (Fase de Grupos + Eliminatorias)</option>
              <option value="league">Premier League (Todos contra Todos)</option>
              <option value="knockout">Copa (Eliminación Directa)</option>
            </select>
          </div>
          {tournament.format === "groups" && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm font-bold text-blue-900 flex items-center gap-2"><Settings size={16}/> Sorteo Automático</p>
              <p className="text-xs text-blue-700 mt-1 mb-3">Define los cabezas de serie y el sistema sorteará el resto aleatoriamente.</p>
              <button className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700">Configurar Sorteo</button>
            </div>
          )}
        </div>
      </div>

      {/* Personalización e Identidad */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><ImageIcon size={18} className="text-purple-600"/> Identidad Visual</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl border-2 border-dashed border-gray-300">
              {tournament.branding.logo}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Logo del Campeonato</label>
              <input type="file" className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Color Principal</label>
            <div className="flex gap-2 items-center">
              <input type="color" defaultValue={tournament.branding.color} className="w-10 h-10 rounded cursor-pointer" />
              <span className="text-xs text-gray-500">Se usará en reportes y tablas públicas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- 2. FINANZAS AVANZADAS (Contabilidad estricta) ---
const FinancesView = ({ finances, teams }: { finances: typeof INITIAL_FINANCES, teams: typeof INITIAL_TEAMS }) => {
  const totalCobrado = finances.reduce((acc, f) => acc + f.paid, 0);
  const totalPendiente = finances.reduce((acc, f) => acc + (f.amount - f.paid), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-gray-900">Módulo Financiero</h2>
        <p className="text-sm text-gray-500">Control de pagos en USD (Ecuador), métodos y trazabilidad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-sm font-medium opacity-80">Recaudado (USD)</p>
          <p className="text-4xl font-black mt-1">{fmtUSD(totalCobrado)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 rounded-2xl text-white shadow-lg">
          <p className="text-sm font-medium opacity-80">Cartera Vencida (USD)</p>
          <p className="text-4xl font-black mt-1">{fmtUSD(totalPendiente)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-center gap-2 shadow-sm">
          <button className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-700 font-bold py-2.5 rounded-xl hover:bg-blue-100 transition"><Download size={18}/> Exportar Reporte Excel</button>
          <button className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-100 transition"><Plus size={18}/> Registrar Nuevo Pago</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><CreditCard size={18} /> Historial de Transacciones</h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
            <tr>
              <th className="px-6 py-3">Equipo</th>
              <th className="px-6 py-3">Concepto</th>
              <th className="px-6 py-3 text-center">Estado</th>
              <th className="px-6 py-3 text-center">Abonado / Total</th>
              <th className="px-6 py-3">Método / Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {finances.map((f) => {
              const team = teams.find(t => t.id === f.team_id);
              return (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{team?.logo} {team?.name}</td>
                  <td className="px-6 py-4 text-gray-600">{f.concept}</td>
                  <td className="px-6 py-4 text-center">
                    {f.status === "pagado" && <Badge label="Pagado" color="green" />}
                    {f.status === "parcial" && <Badge label="Parcial" color="yellow" />}
                    {f.status === "pendiente" && <Badge label="Pendiente" color="red" />}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-gray-900">{fmtUSD(f.paid)}</span>
                    <span className="text-xs text-gray-400 ml-1">/ {fmtUSD(f.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold text-gray-900">{f.method || "—"}</div>
                    <div className="text-xs text-gray-500">{fmtDate(f.date) || "Sin fecha"}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 3. CALENDARIO FLEXIBLE (Edición antes de PDF) ---
const CalendarView = ({ matches, teams }: { matches: typeof INITIAL_MATCHES, teams: typeof INITIAL_TEAMS }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Fixture y Horarios</h2>
          <p className="text-sm text-gray-500">Ajusta horarios a petición de los equipos antes de generar el PDF oficial.</p>
        </div>
        <button className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-md">
          <FileText size={18} /> Generar PDF Oficial
        </button>
      </div>

      <div className="grid gap-4">
        {matches.map((match) => {
          const home = teams.find(t => t.id === match.home_id);
          const away = teams.find(t => t.id === match.away_id);
          return (
            <div key={match.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex flex-col items-start gap-2 w-1/4">
                <Badge label={match.round} color="purple" />
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 group cursor-pointer hover:border-blue-400 transition-colors">
                  <span className="text-sm font-bold text-gray-700">{fmtDate(match.date)} · {match.time}</span>
                  <Edit2 size={14} className="text-gray-400 group-hover:text-blue-500" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 flex-1">
                <div className="flex items-center gap-3 w-1/3 justify-end">
                  <span className="font-bold text-lg text-gray-900">{home?.name}</span>
                  <span className="text-3xl">{home?.logo}</span>
                </div>
                <div className="bg-gray-100 text-gray-400 rounded-xl px-4 py-2 font-black text-sm">VS</div>
                <div className="flex items-center gap-3 w-1/3">
                  <span className="text-3xl">{away?.logo}</span>
                  <span className="font-bold text-lg text-gray-900">{away?.name}</span>
                </div>
              </div>

              <div className="w-1/4 flex justify-end">
                <button className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 flex items-center gap-2">
                  <FileText size={16} /> Ver Planilla
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// APP PRINCIPAL (Navegación)
// ============================================================
export default function TournamentApp() {
  const [view, setView] = useState("settings"); // Cambia la vista inicial aquí

  const MENU = [
    { id: "settings", label: "Torneo & Formato", icon: Trophy },
    { id: "calendar", label: "Fixture & Horarios", icon: Calendar },
    { id: "finances", label: "Finanzas (USD)", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Menú Lateral Privado (Organizador) */}
      <aside className="w-64 bg-[#0a1628] text-white flex flex-col fixed inset-y-0 shadow-2xl z-10">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">{INITIAL_TOURNAMENTS[0].branding.logo}</span>
            <h1 className="font-black text-lg leading-tight tracking-tight">GAME-LEGAL<br/><span className="text-blue-400 text-xs font-semibold">TOURNAMENT PRO</span></h1>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {MENU.map((item) => (
            <button key={item.id} onClick={() => setView(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white"><Lock size={16}/></div>
          <div className="text-left">
            <p className="text-xs font-bold text-white">Organizador Privado</p>
            <p className="text-[10px] text-green-400">Protegido con Backup Local + Nube</p>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="ml-64 flex-1 p-8">
        <header className="mb-8 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
            <Shield className="text-green-500" size={20} /> Entorno Seguro — {INITIAL_TOURNAMENTS[0].name}
          </h2>
          <Badge label="Base de Datos Encriptada" color="green" />
        </header>

        {view === "settings" && <TournamentSettingsView tournament={INITIAL_TOURNAMENTS[0]} />}
        {view === "finances" && <FinancesView finances={INITIAL_FINANCES} teams={INITIAL_TEAMS} />}
        {view === "calendar" && <CalendarView matches={INITIAL_MATCHES} teams={INITIAL_TEAMS} />}
      </main>
    </div>
  );
}
