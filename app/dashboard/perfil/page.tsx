"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { compressImage, previewImage } from "@/lib/imageClient";

const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);

const Icons = {
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  crown: "M2 4h20v2H2z M12 8l-3 5-5-3 1 8h14l1-8-5 3z"
};

export default function MiPerfilPage() {
  const [perfil, setPerfil] = useState<any>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      
      if (data) {
        setPerfil({ ...data, email: session.user.email });
        setNombre(data.full_name || "");
        setTelefono(data.phone || "");
        setAvatarUrl(data.avatar_url || "");
        setLogoUrl(data.logo_url || "");
      } else {
        
        setPerfil({ email: session.user.email, role: 'organizer' });
      }
    } catch (error) {
      console.error("Error al cargar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarImagen = async (file: File | undefined, type: "avatar" | "logo") => {
    if (!file) return;
    try {
      const preview = await previewImage(file);
      if (type === "avatar") {
        setAvatarFile(file);
        setAvatarPreview(preview);
      } else {
        setLogoFile(file);
        setLogoPreview(preview);
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const subirImagenPerfil = async (file: File, type: "avatar" | "logo", userId: string) => {
    const compressed = await compressImage(file, { maxWidth: type === "avatar" ? 512 : 720, quality: 0.74, prefix: type });
    const path = `${userId}/${type}-${Date.now()}.webp`;
    const { error } = await supabase.storage.from("profile-assets").upload(path, compressed, { contentType: "image/webp" });
    if (error) throw error;
    return supabase.storage.from("profile-assets").getPublicUrl(path).data.publicUrl;
  };

  const eliminarImagenPerfil = async (type: "avatar" | "logo") => {
    const currentUrl = type === "avatar" ? avatarUrl : logoUrl;
    if (!currentUrl || !window.confirm("¿Eliminar esta imagen del perfil?")) return;
    setProcesando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");
      const path = currentUrl.split("/profile-assets/")[1];
      if (path) await supabase.storage.from("profile-assets").remove([path]);
      const { error } = await supabase.from("profiles").update(type === "avatar" ? { avatar_url: null } : { logo_url: null }).eq("id", session.user.id);
      if (error) throw error;
      if (type === "avatar") {
        setAvatarUrl("");
        setAvatarFile(null);
        setAvatarPreview("");
      } else {
        setLogoUrl("");
        setLogoFile(null);
        setLogoPreview("");
      }
      window.dispatchEvent(new Event("profileChanged"));
    } catch (error: any) {
      alert("No se pudo eliminar la imagen: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      const nextAvatarUrl = avatarFile ? await subirImagenPerfil(avatarFile, "avatar", session.user.id) : avatarUrl;
      const nextLogoUrl = logoFile ? await subirImagenPerfil(logoFile, "logo", session.user.id) : logoUrl;

      const { error } = await supabase.from('profiles').update({
        full_name: nombre,
        phone: telefono,
        avatar_url: nextAvatarUrl || null,
        logo_url: nextLogoUrl || null
      }).eq('id', session.user.id);

      if (error) throw error;
      
      alert("¡Perfil actualizado con éxito! Los cambios se reflejarán en el sistema.");
      // Recargar la página para que el Layout (Header) actualice el nombre inmediatamente
      window.dispatchEvent(new Event("profileChanged"));
      window.location.reload();
    } catch (error: any) {
      alert("Error al actualizar: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <div className="text-[#D4A017] text-center p-20 font-black animate-pulse">Cargando Identidad...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
          <Icon path={Icons.user} size={28} className="text-[#D4A017]" />
          Configuración de Cuenta
        </h2>
        <p className="text-gray-400 font-bold text-sm mt-1">Administra tu identidad y revisa tu suscripción SaaS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: Formulario de Datos */}
        <div className="md:col-span-2 bg-[#141414] p-8 rounded-2xl border border-[#2E2E2E] shadow-xl">
          <h3 className="text-white font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-4 mb-6">
            Datos Personales
          </h3>
          
          <form onSubmit={guardarPerfil} className="space-y-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-[#1C1C1C] border-2 border-[#D4A017] flex items-center justify-center text-3xl font-black text-[#D4A017] shadow-[0_0_15px_rgba(212,160,23,0.2)] overflow-hidden">
                {(avatarPreview || avatarUrl) ? <Image src={avatarPreview || avatarUrl} alt="Foto de perfil" width={96} height={96} unoptimized className="w-full h-full object-cover" /> : (nombre ? nombre.charAt(0).toUpperCase() : (perfil?.email?.charAt(0)?.toUpperCase() || 'U'))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Foto de perfil</p>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => seleccionarImagen(e.target.files?.[0], "avatar")} className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#D4A017]/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#D4A017]" />
                {(avatarPreview || avatarUrl) && <button type="button" onClick={() => eliminarImagenPerfil("avatar")} className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300">Eliminar foto</button>}
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-[#2E2E2E] bg-[#0a0a0a] p-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Logo del cliente / empresa</label>
              <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="h-24 w-40 rounded-xl border border-[#2E2E2E] bg-[#141414] flex items-center justify-center overflow-hidden">
                  {(logoPreview || logoUrl) ? <Image src={logoPreview || logoUrl} alt="Logo del cliente" width={160} height={96} unoptimized className="h-full w-full object-contain p-2" /> : <span className="text-xs font-bold text-gray-600">Sin logo</span>}
                </div>
                <div className="flex-1 space-y-2">
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => seleccionarImagen(e.target.files?.[0], "logo")} className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#D4A017]/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#D4A017]" />
                  <p className="text-[10px] text-gray-500">Formatos permitidos: JPG, JPEG, PNG, WEBP. La app comprime a WEBP automáticamente.</p>
                  {(logoPreview || logoUrl) && <button type="button" onClick={() => eliminarImagenPerfil("logo")} className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300">Eliminar logo</button>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre Completo / Empresa</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full p-3 mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="Ej: Juan Pérez" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Teléfono de Contacto</label>
                <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} className="w-full p-3 mt-1 bg-[#0a0a0a] border border-[#2E2E2E] text-white rounded-xl focus:outline-none focus:border-[#D4A017]" placeholder="Ej: 0991234567" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico (Solo Lectura)</label>
                <input type="email" value={perfil?.email} disabled className="w-full p-3 mt-1 bg-[#1C1C1C] border border-[#2E2E2E] text-gray-500 rounded-xl cursor-not-allowed" />
              </div>
            </div>

            <div className="pt-4 border-t border-[#2E2E2E]">
              <button type="submit" disabled={procesando} className="w-full md:w-auto px-8 py-3 bg-[#D4A017] text-black font-black uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_15px_rgba(212,160,23,0.3)]">
                {procesando ? "Guardando..." : "Guardar Identidad"}
              </button>
            </div>
          </form>
        </div>

        {/* COLUMNA DERECHA: Estado del SaaS */}
        <div className="space-y-6">
          <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-[#2E2E2E] shadow-xl relative overflow-hidden">
            {perfil?.role === 'superadmin' && <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />}
            
            <h3 className="text-white font-black uppercase tracking-widest text-sm border-b border-[#2E2E2E] pb-4 mb-6 flex items-center gap-2 relative z-10">
              <Icon path={Icons.shield} size={18} className={perfil?.role === 'superadmin' ? 'text-red-500' : 'text-blue-500'} />
              Plan de Suscripción
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rol de Sistema</p>
                <p className={`font-black uppercase tracking-widest text-lg ${perfil?.role === 'superadmin' ? 'text-red-500' : 'text-white'}`}>
                  {perfil?.role === 'superadmin' ? 'Dueño Maestro' : 'Organizador Pro'}
                </p>
              </div>
              
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Estado Financiero</p>
                {perfil?.role === 'superadmin' ? (
                  <span className="bg-red-900/30 text-red-500 border border-red-900/50 text-[10px] font-black uppercase px-2 py-1 rounded">Intocable</span>
                ) : perfil?.saas_status === 'active' ? (
                  <span className="bg-green-900/30 text-green-500 border border-green-900/50 text-[10px] font-black uppercase px-2 py-1 rounded">Al Día</span>
                ) : (
                  <span className="bg-yellow-900/30 text-yellow-500 border border-yellow-900/50 text-[10px] font-black uppercase px-2 py-1 rounded animate-pulse">Deuda Pendiente</span>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Límite de Torneos</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white leading-none">{perfil?.role === 'superadmin' ? '∞' : perfil?.max_tournaments || 1}</span>
                  <span className="text-xs font-bold text-gray-500 pb-1">Permitidos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
