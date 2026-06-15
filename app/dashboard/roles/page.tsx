"use client";

import { useCallback, useEffect, useState } from "react";

const roleLabels: Record<string, string> = { admin: "Administrador", finance: "Tesorería", referee: "Árbitro / Vocal", viewer: "Solo lectura" };

export default function RolesPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [message, setMessage] = useState("");
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  const load = useCallback(async (id = tournamentId) => {
    if (!id) return;
    const response = await fetch(`/api/tournaments/members?tournament_id=${id}`, { credentials: "include", cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "No se pudieron cargar los roles");
    setMembers(data.members || []);
  }, [tournamentId]);

  useEffect(() => {
    const activeId = localStorage.getItem("activeTournamentId");
    setTournamentId(activeId);
    load(activeId);
  }, [load]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/tournaments/members", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tournament_id: tournamentId, email, role }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Acceso asignado correctamente." : data.error);
    if (response.ok) { setEmail(""); load(); }
  };

  const remove = async (userId: string) => {
    const response = await fetch("/api/tournaments/members", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tournament_id: tournamentId, user_id: userId }),
    });
    if (response.ok) load();
  };

  if (!tournamentId) return <p className="text-gray-400">Selecciona primero un torneo para gestionar sus accesos.</p>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-[#2E2E2E] pb-4">
        <h2 className="text-3xl font-black uppercase">Roles y permisos</h2>
        <p className="text-gray-400 text-sm mt-1">Asigna únicamente el acceso necesario para operar este torneo.</p>
      </div>
      {message && <div className="bg-blue-950/40 border border-blue-700 text-blue-200 p-3 rounded-xl text-sm">{message}</div>}
      <form onSubmit={add} className="grid md:grid-cols-[1fr_220px_auto] gap-3 bg-[#141414] border border-[#2E2E2E] p-5 rounded-2xl">
        <input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="correo@organizacion.com" className="p-3 rounded-xl" />
        <select value={role} onChange={event => setRole(event.target.value)} className="p-3 rounded-xl">
          {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="bg-[#D4A017] text-black px-5 py-3 rounded-xl font-black uppercase text-xs">Asignar acceso</button>
      </form>
      <div className="bg-[#141414] border border-[#2E2E2E] rounded-2xl overflow-hidden">
        {members.length === 0 ? <p className="p-8 text-gray-500 text-center">No existen colaboradores asignados.</p> : members.map(member => (
          <div key={member.id} className="p-4 border-b border-[#2E2E2E] flex items-center justify-between gap-4">
            <div><p className="font-black uppercase">{member.profile?.full_name || member.profile?.email}</p><p className="text-xs text-gray-500">{member.profile?.email}</p></div>
            <span className="text-[#D4A017] text-xs font-black uppercase">{roleLabels[member.role] || member.role}</span>
            <button onClick={() => remove(member.user_id)} className="text-red-400 border border-red-900 px-3 py-2 rounded-lg text-[10px] font-black uppercase">Retirar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
