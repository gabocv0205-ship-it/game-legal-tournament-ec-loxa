"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  AnimatedStatsBlock,
  EliteTournamentCard,
  HighEndFooter,
  HighEndNavbar,
  PremiumHero,
  PremiumSectionTitle,
  PublicTournamentLayout,
  SponsorMarquee,
} from "@/app/components/public/PremiumPublic";

const defaultSponsors = [
  "Dra. Gina Calva - Notaria Primera Del Canton Loja",
  "Dr. Alex Avila",
  "Game-Legal Estudio Juridico Virtual",
  "Cafeteria Coffee Time",
  "Mister Copy",
  "Botanitas Express",
  "Torneos Calib",
  "Multipagos San Sebastian",
];

export default function PortalPrincipal() {
  const router = useRouter();
  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [visitas, setVisitas] = useState(0);
  const [torneoDestacado, setTorneoDestacado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sesionActiva, setSesionActiva] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    async function inicializarPortal() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSesionActiva(Boolean(session));

        await supabase.from("status_visits").insert([{}]);
        const { count } = await supabase.from("status_visits").select("*", { count: "exact", head: true });
        if (count) setVisitas(count);

        const { data: tourneys } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
        const visibles = (tourneys || []).filter((torneo: any) => !["finished", "archived", "deleted"].includes(String(torneo.status || "active")));
        setTorneosActivos(visibles);
        setTorneoDestacado(visibles[0] || null);
      } catch (err) {
        console.error("Error cargando portal principal:", err);
      } finally {
        setLoading(false);
      }
    }

    inicializarPortal();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSesionActiva(Boolean(session)));
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Credenciales incorrectas. Acceso denegado.");
      setAuthLoading(false);
      return;
    }
    router.push("/dashboard/torneos");
  };

  const handleRecuperarPassword = async () => {
    if (!email) {
      alert("Ingresa tu correo electronico primero.");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/dashboard` });
    alert(error ? `Error al enviar el correo: ${error.message}` : "Te enviamos un enlace de recuperacion.");
    setAuthLoading(false);
  };

  return (
    <PublicTournamentLayout>
      <HighEndNavbar
        sessionActive={sesionActiva}
        onLogin={() => setShowLogin(true)}
        onDashboard={() => router.push("/dashboard/torneos")}
        tournamentName={torneoDestacado?.name}
      />

      <PremiumHero
        eyebrow={torneoDestacado?.name || "Plataforma deportiva premium"}
        title="Gestiona la competicion"
        highlight="como una liga profesional"
        description="Game Legal Tournament convierte calendarios, resultados, tablas, goleadores y comunicacion publica en una experiencia rapida, elegante y lista para moviles."
        primaryLabel={sesionActiva ? "Volver al panel" : "Acceso administrador"}
        onPrimary={() => sesionActiva ? router.push("/dashboard/torneos") : setShowLogin(true)}
        stats={[
          { label: "Torneos activos", value: torneosActivos.length },
          { label: "Visitas publicas", value: visitas || 0 },
          { label: "Modo movil", value: "PWA" },
          { label: "Operacion", value: "24/7" },
        ]}
      />

      <section className="premium-section">
        <PremiumSectionTitle
          eyebrow="Directorio oficial"
          title="Torneos activos"
          text="Cada portal publico mantiene identidad, calendario, posiciones y datos clave con una lectura clara en cancha, oficina o graderio."
        />
        {loading ? (
          <AnimatedStatsBlock stats={[{ label: "Sincronizando torneos", value: "..." }]} />
        ) : (
          <div className="elite-grid">
            {torneosActivos.length ? (
              torneosActivos.map((torneo) => <EliteTournamentCard tournament={torneo} key={torneo.id} />)
            ) : (
              <div className="premium-empty">Aun no hay torneos registrados en el sistema.</div>
            )}
          </div>
        )}
      </section>

      <section className="premium-section">
        <PremiumSectionTitle
          eyebrow="Sistema competitivo"
          title="Visual, rapido y preparado para publico real"
          text="Una presencia de alto contraste para la noche y un modo claro legible para exteriores, con preferencia guardada en este dispositivo."
        />
        <AnimatedStatsBlock
          stats={[
            { label: "Tablas y fixture", value: "Live" },
            { label: "Sponsors", value: "Pro" },
            { label: "Offline", value: "Ready" },
            { label: "Mobile-first", value: "100%" },
          ]}
        />
      </section>

      <SponsorMarquee sponsors={defaultSponsors} />
      <HighEndFooter />

      {showLogin && (
        <div className="premium-modal">
          <div className="premium-modal-card">
            <button type="button" onClick={() => setShowLogin(false)} className="float-right text-sm font-black text-gray-400">Cerrar</button>
            <h3 className="text-2xl font-black uppercase">Acceso Pro</h3>
            <p className="mb-6 mt-1 text-sm text-gray-400">Panel de administracion</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest">
                Correo electronico
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@gamelegal.com" />
              </label>
              <label className="block text-xs font-black uppercase tracking-widest">
                Contrasena
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" />
              </label>
              <button type="button" onClick={handleRecuperarPassword} className="text-xs font-black uppercase tracking-widest text-green-400">
                Olvide mi contrasena
              </button>
              <button type="submit" disabled={authLoading} className="premium-cta w-full justify-center">
                {authLoading ? "Verificando..." : "Ingresar al panel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PublicTournamentLayout>
  );
}
