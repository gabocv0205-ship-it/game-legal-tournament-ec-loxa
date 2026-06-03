"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);

const Icons = {
  crown: "M2 4h20v2H2z M12 8l-3 5-5-3 1 8h14l1-8-5 3z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  check: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  ban: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M4.93 4.93l14.14 14.14",
  plus: "M12 5v14M5 12h14"
};

export default function BovedaSuperAdmin() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Estados Modal Crear Cliente
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (id: string, nuevoEstado: string, esSuperAdmin: boolean) => {
    if (esSuperAdmin) return alert("¡No puedes suspender o cobrarle al Súper Administrador Maestro!");
    setProcesandoId(id);
    try {
      const { error } = await supabase.from('profiles').update({ saas_status: nuevoEstado }).eq('id', id);
      if (error) throw error;
      await cargarClientes();
    } catch (error: any) {
      alert("Error al actualizar estado: " + error.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const actualizarLimiteTorneos = async (id: string, nuevoLimite: number) => {
    setProcesandoId(id);
    try {
      const { error } = await supabase.from('profiles').update({ max_tournaments: nuevoLimite }).eq('id', id);
      if (error) throw error;
      await cargarClientes();
    } catch (error: any) {
      alert("Error al actualizar límite: " + error.message);
    } finally {
      setProcesandoId(null);
    }
  };

  // Función para crear un cliente conectada a la API
  const crearClienteSaaS = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoCliente(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nuevoEmail, password: nuevaClave, full_name: nuevoNombre })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Error al crear cliente.");

      alert(`¡Cliente ${nuevoNombre} creado exitosamente!\n\nCredenciales:\nCorreo: ${nuevoEmail}\nClave: ${nuevaClave}`);
      
      setMostrarModalCrear(false);
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevaClave("");
      cargarClientes();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCreandoCliente(false);
    }
  };

  const generarClaveAleatoria = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNuevaClave(pass);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-red-500 font-black uppercase tracking-widest text-sm animate-pulse">Accediendo a la Bóveda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[#D4A017] hover:text-white font-black uppercase tracking-widest text-xs transition-colors mb-2 bg-[#1C1C1C] px-4 py-2 rounded-lg border border-[#2E2E2E] w-fit shadow-md">
        ← Volver al Panel Principal
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#D4A017]/30 pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Icon path={Icons.shield} size={28} className="text-red-600" /> Control de Clientes
          </h2>
          <p className="text-gray-400 font-bold text-sm mt-1">Gestión de Suscripciones SaaS</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMostrarModalCrear(true)}
            className="flex items-center gap-2 bg-[#D4A017] hover:bg-yellow-500 text-black font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)]"
          >
            <Icon path={Icons.plus} size={16} /> Nuevo Cliente
          </button>
          <div className="bg-[#140505] px-4 py-2 rounded-xl border border-red-900/30 flex items-center gap-2">
            <span className="text-red-500/70 text-xs font-bold uppercase tracking-widest">Acceso:</span>
            <span className="text-red-500 font-black text-lg tracking-widest flex items-center gap-2"><Icon path={Icons.crown} size={18} /> DIOS</span>
          </div>
        </div>
      </div>

      <div className="bg-[#141414] rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.05)] border border-[#2E2E2E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white whitespace-nowrap">
            <thead className="bg-[#0a0a0a] text-gray-500 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
              <tr>
                <th className="p-4">Cliente / Organizador</th>
                <th className="p-4 text-center">Límite de Torneos</th>
                <th className="p-4 text-center">Estado Financiero</th>
                <th className="p-4 text-center">Acciones de Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2E2E]">
              {clientes.map(cliente => {
                const esSuperAdmin = cliente.role === 'superadmin';
                const isProcesando = procesandoId === cliente.id;

                return (
                  <tr key={cliente.id} className={`hover:bg-[#1C1C1C] transition-colors ${esSuperAdmin ? 'bg-red-950/10' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shadow-lg ${esSuperAdmin ? 'bg-gradient-to-r from-red-600 to-red-900 text-white' : 'bg-[#2E2E2E] text-gray-400'}`}>
                          {esSuperAdmin ? <Icon path={Icons.crown} size={16} /> : <Icon path={Icons.users} size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm uppercase">{cliente.full_name || 'Usuario Sin Nombre'}</p>
                          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">
                            {esSuperAdmin ? 'Dueño del Sistema' : cliente.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {esSuperAdmin ? (
                        <span className="text-[#D4A017] font-black tracking-widest text-lg">∞</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => actualizarLimiteTorneos(cliente.id, Math.max(1, (cliente.max_tournaments || 1) - 1))} className="w-6 h-6 rounded bg-[#2E2E2E] text-gray-400 hover:text-white font-bold">-</button>
                          <span className="font-mono font-black text-lg w-6 text-center">{cliente.max_tournaments || 1}</span>
                          <button onClick={() => actualizarLimiteTorneos(cliente.id, (cliente.max_tournaments || 1) + 1)} className="w-6 h-6 rounded bg-[#2E2E2E] text-gray-400 hover:text-white font-bold">+</button>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {esSuperAdmin ? (
                        <span className="inline-block border border-red-600 text-red-500 bg-red-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Intocable</span>
                      ) : cliente.saas_status === 'active' ? (
                        <span className="inline-block border border-green-600 text-green-500 bg-green-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Al Día</span>
                      ) : cliente.saas_status === 'pending_payment' ? (
                        <span className="inline-block border border-yellow-600 text-yellow-500 bg-yellow-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">Debe Pago</span>
                      ) : (
                        <span className="inline-block border border-red-600 text-red-500 bg-red-900/20 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded animate-pulse">Suspendido</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => actualizarEstado(cliente.id, 'active', esSuperAdmin)} disabled={esSuperAdmin || isProcesando} className={`p-2 rounded transition-all ${cliente.saas_status === 'active' ? 'bg-green-900/30 text-green-500 cursor-not-allowed' : 'bg-[#2E2E2E] text-gray-400 hover:bg-green-600 hover:text-white'}`}><Icon path={Icons.check} size={16} /></button>
                        <button onClick={() => actualizarEstado(cliente.id, 'pending_payment', esSuperAdmin)} disabled={esSuperAdmin || isProcesando} className={`p-2 rounded transition-all ${cliente.saas_status === 'pending_payment' ? 'bg-yellow-900/30 text-yellow-500 cursor-not-allowed' : 'bg-[#2E2E2E] text-gray-400 hover:bg-yellow-600 hover:text-white'}`}><Icon path={Icons.alert} size={16} /></button>
                        <button onClick={() => actualizarEstado(cliente.id, 'suspended', esSuperAdmin)} disabled={esSuperAdmin || isProcesando} className={`p-2 rounded transition-all ${cliente.saas_status === 'suspended' ? 'bg-red-900/30 text-red-500 cursor-not-allowed' : 'bg-[#2E2E2E] text-gray-400 hover:bg-red-600 hover:text-white'}`}><Icon path={Icons.ban} size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR CLIENTE */}
      {mostrarModalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1C1C1C] w-full max-w-md border border-[#D4A017]/50 rounded-2xl shadow-[0_0_50px_rgba(212,160,23,0.15)] overflow-hidden">
            <div className="p-6 border-b border-[#2E2E2E]">
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Icon path={Icons.users} size={20} className="text-[#D4A017]" /> Registrar Nuevo Cliente
              </h3>
            </div>
            
            <form onSubmit={crearClienteSaaS} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#D4A017] uppercase tracking-widest">Nombre de la Organización / Cliente</label>
                <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:border-[#D4A017] outline-none" required placeholder="Ej: Liga Barrial Sur" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#D4A017] uppercase tracking-widest">Correo de Acceso (Usuario)</label>
                <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:border-[#D4A017] outline-none" required placeholder="cliente@correo.com" />
              </div>
              <div>
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-[#D4A017] uppercase tracking-widest">Contraseña Provisional</label>
                  <button type="button" onClick={generarClaveAleatoria} className="text-xs text-gray-400 hover:text-white font-bold uppercase underline">Auto-Generar</button>
                </div>
                <input type="text" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white p-3 rounded-xl focus:border-[#D4A017] outline-none font-mono" required placeholder="Mínimo 6 caracteres" minLength={6} />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-[#2E2E2E]">
                <button type="button" onClick={() => setMostrarModalCrear(false)} className="flex-1 py-3 bg-[#141414] text-gray-400 font-bold uppercase tracking-widest text-xs rounded-xl hover:text-white transition-all">Cancelar</button>
                <button type="submit" disabled={creandoCliente} className="flex-1 py-3 bg-[#D4A017] text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:bg-yellow-500 transition-all">
                  {creandoCliente ? "Inyectando..." : "Dar de Alta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
