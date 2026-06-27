"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Award, FileText, Goal, Images, ListOrdered, Shield, Trophy, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calculateStandings, normalizeTournamentConfig } from "@/lib/tournamentEngine";
import {
  AnimatedStatsBlock,
  EmptyState,
  GlassMatchCard,
  HighEndFooter,
  HighEndNavbar,
  PhotoGalleryGrid,
  PremiumHero,
  PremiumSectionTitle,
  PremiumStandingsTable,
  PublicTournamentLayout,
  SponsorMarquee,
} from "@/app/components/public/PremiumPublic";

const fallbackSponsors = [
  "Dra. Gina Calva - Notaria Primera Del Canton Loja",
  "Dr. Alex Avila",
  "Game-Legal Estudio Juridico Virtual",
  "Cafeteria Coffee Time",
  "Mister Copy",
  "Botanitas Express",
  "Torneos Calib",
  "Multipagos San Sebastian",
];

const tabs = [
  { id: "posiciones", label: "Posiciones", icon: ListOrdered },
  { id: "partidos", label: "Partidos", icon: Trophy },
  { id: "goleadores", label: "Goleadores", icon: Goal },
  { id: "equipos", label: "Equipos", icon: Shield },
  { id: "premios", label: "Premios", icon: Award },
  { id: "galeria", label: "Galeria", icon: Images },
  { id: "reglamento", label: "Reglamento", icon: FileText },
];

export default function PortalTorneoDinamico() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug || "");
  const [torneoActual, setTorneoActual] = useState<any>(null);
  const [tabla, setTabla] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [visitas, setVisitas] = useState(0);
  const [activeTab, setActiveTab] = useState("posiciones");
  const [errorTorneo, setErrorTorneo] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [sesionActiva, setSesionActiva] = useState(false);

  useEffect(() => {
    async function inicializarPortal() {
      try {
        if (!slug) return;
        setOffline(!navigator.onLine);

        const { data: { session } } = await supabase.auth.getSession();
        setSesionActiva(Boolean(session));

        await supabase.from("status_visits").insert([{}]);
        const { count } = await supabase.from("status_visits").select("*", { count: "exact", head: true });
        if (count) setVisitas(count);

        const { data: tourney } = await supabase.from("tournaments").select("*").eq("slug", slug).single();
        if (!tourney) {
          setErrorTorneo(true);
          return;
        }

        setTorneoActual(tourney);
        localStorage.setItem(`gamelegal-tournament-${slug}`, JSON.stringify(tourney));

        const [{ data: teams }, { data: matches }, playersResponse] = await Promise.all([
          supabase.from("teams").select("*").eq("tournament_id", tourney.id),
          supabase.from("matches")
            .select("*, home:home_team_id(id, name, shield_url), away:away_team_id(id, name, shield_url)")
            .eq("tournament_id", tourney.id)
            .order("match_date", { ascending: true }),
          supabase.from("public_players").select("*").eq("tournament_id", tourney.id),
        ]);

        setEquipos(teams || []);
        setPartidos(matches || []);
        setJugadores(playersResponse.data || []);

        localStorage.setItem(`gamelegal-teams-${slug}`, JSON.stringify(teams || []));
        localStorage.setItem(`gamelegal-matches-${slug}`, JSON.stringify(matches || []));

        const groupMatches = (matches || []).filter((match) => match.status === "finished" && match.stage === "Fase de Grupos");
        setTabla(Object.values(calculateStandings(teams || [], groupMatches, [], normalizeTournamentConfig(tourney))).flat());

        const scorersResponse = await fetch(`/api/public/tournaments/${encodeURIComponent(slug)}/scorers`, { cache: "no-store" });
        const scorersData = await scorersResponse.json();
        setGoleadores(scorersResponse.ok ? scorersData.scorers || [] : []);
      } catch (err) {
        console.error("Error cargando portal:", err);
        const cachedTournament = localStorage.getItem(`gamelegal-tournament-${slug}`);
        const cachedTeams = localStorage.getItem(`gamelegal-teams-${slug}`);
        const cachedMatches = localStorage.getItem(`gamelegal-matches-${slug}`);
        if (cachedTournament) {
          setTorneoActual(JSON.parse(cachedTournament));
          setEquipos(cachedTeams ? JSON.parse(cachedTeams) : []);
          setPartidos(cachedMatches ? JSON.parse(cachedMatches) : []);
          setOffline(true);
          return;
        }
        setErrorTorneo(true);
      }
    }

    inicializarPortal();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSesionActiva(Boolean(session)));
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Credenciales incorrectas. Acceso denegado.");
      setAuthLoading(false);
      return;
    }
    if (torneoActual) localStorage.setItem("activeTournamentId", torneoActual.id);
    router.push("/dashboard/partidos");
  };

  const posicionesPorGrupo = useMemo(() => tabla.reduce<Record<string, any[]>>((groups, team) => {
    (groups[team.group || "General"] ||= []).push(team);
    return groups;
  }, {}), [tabla]);

  const partidosPorFecha = useMemo(() => partidos.reduce<Record<string, any[]>>((groups, match) => {
    const key = String(match.matchday || "Sin fecha");
    (groups[key] ||= []).push(match);
    return groups;
  }, {}), [partidos]);

  if (errorTorneo) {
    return (
      <PublicTournamentLayout>
        <section className="premium-section min-h-screen grid place-items-center">
          <div className="premium-empty">
            <Trophy size={42} />
            <h1 className="text-4xl font-black uppercase">Torneo no encontrado</h1>
            <p>El enlace no es valido o el torneo fue eliminado.</p>
            <Link href="/" className="premium-cta">Volver al inicio</Link>
          </div>
        </section>
      </PublicTournamentLayout>
    );
  }

  const isFinalized = ["finished", "archived", "deleted"].includes(String(torneoActual?.status || "active"));
  const sponsors = Array.isArray(torneoActual?.tournament_sponsors) && torneoActual.tournament_sponsors.length
    ? torneoActual.tournament_sponsors
    : fallbackSponsors;

  const championName = torneoActual?.champion_name || "Campeon por confirmar";

  return (
    <PublicTournamentLayout>
      <HighEndNavbar
        sessionActive={sesionActiva}
        onLogin={() => setShowLogin(true)}
        onDashboard={() => router.push("/dashboard/torneos")}
        tournamentName={torneoActual?.name}
      />

      {offline && (
        <div className="mx-auto mt-3 max-w-5xl rounded-2xl border border-green-400/30 bg-black/40 px-4 py-3 text-sm font-bold text-green-200">
          Estas viendo datos guardados en este dispositivo. La informacion se actualizara cuando vuelva la conexion.
        </div>
      )}

      {isFinalized ? (
        <PremiumHero
          eyebrow="Temporada finalizada"
          title={championName}
          highlight="historia oficial"
          description="El torneo fue archivado con su resultado historico. La informacion publica queda preservada para consulta."
          primaryLabel="Volver al directorio"
          onPrimary={() => router.push("/")}
          stats={[
            { label: "Equipos", value: equipos.length },
            { label: "Partidos", value: partidos.length },
            { label: "Visitas", value: visitas || 0 },
            { label: "Estado", value: "Final" },
          ]}
        />
      ) : (
        <>
          <PremiumHero
            eyebrow="Portal oficial del torneo"
            title={torneoActual?.name || "Torneo oficial"}
            highlight="competicion en vivo"
            description="Consulta posiciones, partidos, goleadores, premios y patrocinadores desde una experiencia publica premium, rapida y preparada para moviles."
            primaryLabel={sesionActiva ? "Administrar torneo" : "Acceso administrador"}
            onPrimary={() => sesionActiva ? router.push("/dashboard/partidos") : setShowLogin(true)}
            stats={[
              { label: "Equipos", value: equipos.length },
              { label: "Partidos", value: partidos.length },
              { label: "Goleadores", value: goleadores.length },
              { label: "Visitas", value: visitas || 0 },
            ]}
          />

          <section className="premium-section">
            <PremiumSectionTitle
              eyebrow="Centro competitivo"
              title="Estado del torneo"
              text="Toda la informacion publica organizada para lectura rapida antes, durante y despues de cada fecha."
            />

            <div className="premium-tabs mb-5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? "active" : ""}>
                    <Icon size={15} className="mr-2 inline" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "posiciones" && <PremiumStandingsTable groups={posicionesPorGrupo} />}

            {activeTab === "partidos" && (
              <div className="space-y-6">
                {Object.keys(partidosPorFecha).length ? Object.entries(partidosPorFecha).map(([fecha, matches]) => (
                  <div key={fecha}>
                    <h3 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-green-400">Fecha {fecha}</h3>
                    <div className="grid gap-4">
                      {matches.map((match) => <GlassMatchCard match={match} key={match.id} />)}
                    </div>
                  </div>
                )) : <EmptyState text="No hay encuentros programados." />}
              </div>
            )}

            {activeTab === "goleadores" && (
              <div className="premium-table-wrap">
                {goleadores.length ? (
                  <div className="table-scroll">
                    <table className="premium-standings-table">
                      <thead><tr><th>Top</th><th>Jugador</th><th>Equipo</th><th>Goles</th></tr></thead>
                      <tbody>
                        {goleadores.map((player, index) => (
                          <tr key={player.id || `${player.name}-${index}`}>
                            <td>{index + 1}</td><td><strong>{player.name}</strong></td><td>{player.team || "Libre"}</td><td><b>{player.goles || 0}</b></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <EmptyState text="Aun no hay artilleros registrados." />}
              </div>
            )}

            {activeTab === "equipos" && (
              <div className="elite-grid">
                {equipos.length ? equipos.map((equipo) => (
                  <div className="elite-tournament-card" key={equipo.id}>
                    <span className="live-pill">Grupo {equipo.group_name || "General"}</span>
                    <h3>{equipo.name}</h3>
                    <p>{equipo.manager_name ? `Dirigente: ${equipo.manager_name}` : "Plantel registrado en el torneo."}</p>
                  </div>
                )) : <EmptyState text="Aun no hay equipos registrados." />}
              </div>
            )}

            {activeTab === "premios" && (
              <AnimatedStatsBlock
                stats={[
                  { label: "Campeon", value: torneoActual?.prize_first || "Por definir" },
                  { label: "Subcampeon", value: torneoActual?.prize_second || "Por definir" },
                  { label: "Tercer lugar", value: torneoActual?.prize_third || "Por definir" },
                  { label: "Formato", value: `${torneoActual?.football_modality || 11} vs ${torneoActual?.football_modality || 11}` },
                ]}
              />
            )}

            {activeTab === "galeria" && <PhotoGalleryGrid teams={equipos} players={jugadores} />}

            {activeTab === "reglamento" && (
              <div className="premium-empty">
                <FileText size={34} />
                <h3 className="text-2xl font-black uppercase">Reglamento oficial</h3>
                {torneoActual?.rules_url ? (
                  <a href={torneoActual.rules_url} target="_blank" rel="noopener noreferrer" className="premium-cta">Ver documento</a>
                ) : (
                  <p>La organizacion aun no habilita el reglamento digital.</p>
                )}
              </div>
            )}
          </section>

          <section className="premium-section">
            <PremiumSectionTitle eyebrow="Auspiciantes" title="Marcas que impulsan la competicion" />
          </section>
          <SponsorMarquee sponsors={sponsors} />
        </>
      )}

      <HighEndFooter />

      {showLogin && (
        <div className="premium-modal">
          <div className="premium-modal-card">
            <button type="button" onClick={() => setShowLogin(false)} className="float-right text-sm font-black text-gray-400">Cerrar</button>
            <h3 className="text-2xl font-black uppercase">Acceso Pro</h3>
            <p className="mb-6 mt-1 text-sm text-gray-400">Panel del torneo</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest">
                Correo electronico
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@gamelegal.com" />
              </label>
              <label className="block text-xs font-black uppercase tracking-widest">
                Contrasena
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="********" />
              </label>
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
