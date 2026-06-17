"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);

const Icons = {
  plus: "M12 5v14M5 12h14",
  trophy: "M8 21h8M12 17v4M7 4h10l1 7c0 3-3 6-6 6s-6-3-6-6l1-7z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  check: "M5 13l4 4L19 7",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
};

export default function GestorTorneos() {
  const router = useRouter();
  const [torneos, setTorneos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados del Modal de Creación
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombreTorneo, setNombreTorneo] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Cargar Perfil (Para ver el límite de torneos)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setPerfil(profile);

      // Cargar torneos dentro del alcance del usuario actual.
      // El superadmin ve todo; cada cliente solo ve sus propios torneos.
      const query = supabase.from('tournaments').select('*').order('created_at', { ascending: false });
      const { data: tourneys, error: torneosError } = profile?.role === 'superadmin'
        ? await query
        : await query.eq('user_id', session.user.id);
      if (torneosError) throw torneosError;
      
      // Filtrar torneos que no estén marcados como eliminados lógicamente
      const torneosActivos = (tourneys || []).filter((t: any) => t.status !== 'deleted');
      setTorneos(torneosActivos);

    } catch (error) {
      console.error("Error al cargar el gestor:", error);
    } finally {
      setLoading(false);
    }
  };

  const manejarCreacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreTorneo) return;
    
    setProcesando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const baseSlug = nombreTorneo.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const randomID = Math.random().toString(36).substring(2, 7);
      const slugUnico = `${baseSlug}-${randomID}`;

      const { data: created, error } = await supabase.from('tournaments').insert([{
        name: nombreTorneo,
        slug: slugUnico,
        user_id: session?.user.id,
        registration_fee: 150.00,
        status: 'active' // Estado explícito al crear
      }]).select('id, name').single();

      if (error) throw error;

      if (created) {
        localStorage.setItem('activeTournamentId', created.id);
        localStorage.setItem('activeTournamentName', created.name);
      }
      setMostrarModal(false);
      setNombreTorneo("");
      cargarDatos();
      alert("Torneo creado. Completa su configuración inicial antes de continuar.");
      router.push('/dashboard/configuracion');

    } catch (error: any) {
      alert("Error al crear el torneo: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  // NUEVA FUNCIÓN: Clausura Deportiva
  const finalizarTorneo = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de FINALIZAR el torneo "${nombre}"?\n\nEsta acción conservará el historial, pero iniciará el proceso automatizado de cierre de temporada.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('tournaments').update({ status: 'finished' }).eq('id', id);
      if (error) throw error;
      cargarDatos();
    } catch (err: any) {
      alert('Error al finalizar: ' + err.message);
      setLoading(false);
    }
  };

  // NUEVA FUNCIÓN: Soft Delete (Borrado Lógico)
  const eliminarTorneo = async (id: string, nombre: string) => {
    if (!window.confirm(`¡ATENCIÓN! ¿Deseas ELIMINAR el torneo "${nombre}"?\n\nEsta acción lo ocultará de tu panel para liberar espacio en tu plan, pero los datos se conservarán internamente por seguridad referencial.`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('tournaments').update({ status: 'deleted' }).eq('id', id);
      if (error) throw error;
      cargarDatos();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
      setLoading(false);
    }
  };

  const administrarTorneo = (torneoId: string, torneoNombre: string, configurado = true) => {
    localStorage.setItem('activeTournamentId', torneoId);
    localStorage.setItem('activeTournamentName', torneoNombre);
    window.dispatchEvent(new Event('tournamentChanged'));
    router.push(configurado ? '/dashboard' : '/dashboard/configuracion');
  };

  const verPortalPublico = (slug: string) => {
    window.open(`/torneo/${slug}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#D4A017] font-black uppercase tracking-widest text-sm animate-pulse">Sincronizando Gestor SaaS...</p>
      </div>
    );
  }

  // El límite ahora evalúa solo los torneos que no han sido eliminados lógicamente
  const limiteAlcanzado = perfil?.role !== 'superadmin' && torneos.length >= (perfil?.max_tournaments || 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#2E2E2E] pb-4 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">Mis Torneos</h2>
          <p className="text-gray-400 font-bold text-sm mt-1">
            {perfil?.role === 'superadmin' ? 'Visión global de todos los clientes' : `Límite de plan: ${torneos.length} / ${perfil?.max_tournaments || 1}`}
          </p>
        </div>
        
        <button 
          onClick={() => setMostrarModal(true)}
          disabled={limiteAlcanzado}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${limiteAlcanzado ? 'bg-[#2E2E2E] text-gray-500 cursor-not-allowed' : 'bg-[#D4A017] text-black shadow-[0_0_20px_rgba(212,160,23,0.3)] hover:scale-105 hover:bg-yellow-500'}`}
        >
          <Icon path={Icons.plus} size={18} /> 
          {limiteAlcanzado ? 'Límite Alcanzado' : 'Nuevo Torneo'}
        </button>
      </div>

      {torneos.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-[#2E2E2E] rounded-3xl">
          <Icon path={Icons.trophy} size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 font-bold text-lg">Aún no tienes torneos creados.</p>
          <p className="text-gray-600 text-sm mt-2">Haz clic en &quot;Nuevo Torneo&quot; para empezar tu gestión.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {torneos.map(t => {
            // Evaluador de Insignias Dinámicas
            const isFinished = t.status === 'finished';
            const isArchived = t.status === 'archived';
            const isActive = !isFinished && !isArchived;

            return (
              <div key={t.id} className="bg-[#141414] border border-[#2E2E2E] rounded-2xl p-6 relative overflow-hidden group hover:border-[#D4A017] transition-all duration-300 flex flex-col h-full shadow-lg">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#D4A017]/5 rounded-full blur-2xl group-hover:bg-[#D4A017]/20 transition-all"></div>
                
                {/* Controles de Gestión Rápida Supriores */}
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  {isActive && (
                    <button 
                      onClick={() => finalizarTorneo(t.id, t.name)} 
                      title="Finalizar Torneo" 
                      className="w-8 h-8 bg-[#1C1C1C] border border-[#2E2E2E] rounded-full flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg"
                    >
                      <Icon path={Icons.check} size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => eliminarTorneo(t.id, t.name)} 
                    title="Eliminar Torneo" 
                    className="w-8 h-8 bg-[#1C1C1C] border border-[#2E2E2E] rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <Icon path={Icons.trash} size={14} />
                  </button>
                </div>

                <div className="relative z-10 flex-1 mt-2">
                  <div className="flex items-start justify-between mb-4 pr-16">
                    <div className="w-12 h-12 bg-[#1C1C1C] border border-[#D4A017]/30 rounded-full flex items-center justify-center text-[#D4A017] shadow-inner">
                      <Icon path={Icons.trophy} size={24} />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-white uppercase tracking-wide mb-1 truncate pr-2" title={t.name}>{t.name || 'Torneo Sin Nombre'}</h3>
                  <p className="text-[10px] text-gray-500 font-mono mb-4 truncate">ID: {t.slug}</p>

                  {/* Insignias de Estado del Torneo */}
                  <div className="flex gap-2 mb-4">
                    {perfil?.role === 'superadmin' && (
                      <span className="bg-red-900/30 text-red-500 border border-red-900/50 text-[9px] font-black uppercase px-2 py-1 rounded">Soporte Admin</span>
                    )}
                    {isFinished && <span className="bg-green-900/30 text-green-500 border border-green-900/50 text-[9px] font-black uppercase px-2 py-1 rounded">Finalizado</span>}
                    {isArchived && <span className="bg-gray-800 text-gray-400 border border-gray-600 text-[9px] font-black uppercase px-2 py-1 rounded">Archivado Histórico</span>}
                    {isActive && <span className="bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/30 text-[9px] font-black uppercase px-2 py-1 rounded">Activo</span>}
                  </div>
                </div>

                <div className="relative z-10 flex gap-3 mt-auto pt-4 border-t border-[#2E2E2E]">
                  <button 
                    onClick={() => administrarTorneo(t.id, t.name, Boolean(t.configuration_completed))}
                    className="flex-1 bg-[#1C1C1C] hover:bg-[#D4A017] hover:text-black text-white border border-[#2E2E2E] hover:border-transparent py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Icon path={Icons.settings} size={14} /> Gestionar
                  </button>
                  <button 
                    onClick={() => verPortalPublico(t.slug)}
                    title="Ver página pública de este torneo"
                    className="w-10 h-10 bg-[#1C1C1C] hover:bg-[#2A2A2A] text-gray-400 hover:text-white border border-[#2E2E2E] rounded-lg flex items-center justify-center transition-all"
                  >
                    <Icon path={Icons.eye} size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CREACIÓN */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] w-full max-w-md border border-[#D4A017]/50 rounded-2xl shadow-[0_0_40px_rgba(212,160,23,0.15)] overflow-hidden">
            <div className="p-6 border-b border-[#2E2E2E] flex justify-between items-center">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Crear Nuevo Torneo</h3>
              <button onClick={() => setMostrarModal(false)} className="text-gray-500 hover:text-white">✖</button>
            </div>
            <form onSubmit={manejarCreacion} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-[#D4A017] uppercase tracking-widest">Nombre de la Competición</label>
                <input 
                  type="text" 
                  value={nombreTorneo} 
                  onChange={(e) => setNombreTorneo(e.target.value)}
                  className="w-full mt-2 bg-[#0a0a0a] border border-[#2E2E2E] text-white font-bold p-3 rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors"
                  placeholder="Ej. Copa de Campeones 2026"
                  required
                />
              </div>
              <button type="submit" disabled={procesando} className="w-full py-4 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
                {procesando ? "Configurando Servidor..." : "Generar Torneo"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
