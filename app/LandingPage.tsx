"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CirclePlay,
  ClipboardList,
  Goal,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SponsorMarquee } from "@/components/SponsorMarquee";
import styles from "./landing.module.css";

type Tournament = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  created_at: string;
  banner_url: string | null;
  poster_url: string | null;
};
const isDemo = (t: Tournament) =>
  t.name.toLocaleLowerCase().includes("champions loxa 2026");
const whatsapp = (message: string) =>
  `https://wa.me/593960553548?text=${encodeURIComponent(message)}`;
const SHOWCASE = [
  {
    title: "Calendario",
    subtitle: "Cada jornada, lista para compartir.",
    description:
      "Presenta los encuentros, los horarios y las canchas con la identidad de tu campeonato.",
    image: "/showcase/champions-loxa-partidos.webp",
    icon: CalendarDays,
  },
  {
    title: "Sorteo y grupos",
    subtitle: "La emoción empieza antes del partido.",
    description:
      "Organiza los grupos y comparte el camino que recorrerá cada equipo durante la competición.",
    image: "/showcase/champions-loxa-sorteo.jpg",
    icon: Layers3,
  },
  {
    title: "Posiciones",
    subtitle: "La tabla que todos quieren mirar.",
    description:
      "Acerca resultados y clasificación a tu comunidad desde la página pública del torneo.",
    image: "/showcase/champions-loxa-posiciones.webp",
    icon: ClipboardList,
  },
  {
    title: "Goleadores",
    subtitle: "Dale protagonismo a tu talento.",
    description:
      "Haz visibles a los jugadores que marcan la diferencia y comparte sus estadísticas.",
    image: "/showcase/champions-loxa-goleadores.webp",
    icon: Goal,
  },
];
const SPONSORS = [
  "⚖️ Dra. Gina Calva - Notaría Primera Del Cantón Loja",
  "👨‍⚖️ Dr. Alex Ávila",
  "📚 Game-Legal Estudio Jurídico Virtual",
  "☕ Cafetería Coffee Time",
  "🖨️ Mister Copy",
  "🍿 Botanitas Express",
  "🌴 Torneos Calib",
  "💳 Multipagos San Sebastián",
];

async function track(eventType: string, payload: Record<string, unknown> = {}) {
  try {
    let visitorKey = localStorage.getItem("gameLegalCommercialVisitor");
    if (!visitorKey) {
      visitorKey = crypto.randomUUID();
      localStorage.setItem("gameLegalCommercialVisitor", visitorKey);
    }
    await supabase
      .from("commercial_events")
      .insert({
        event_type: eventType,
        visitor_key: visitorKey,
        page_path: "/",
        payload,
      });
  } catch {
    /* Analytics must never interrupt the page. */
  }
}

function Cover({
  tournament,
  priority,
}: {
  tournament: Tournament;
  priority: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = [tournament.banner_url, tournament.poster_url].find(
    (url) =>
      url && /^(https?:\/\/|\/(?!\/))/.test(url) && !failed.includes(url),
  );
  return (
    <div className={styles.cover}>
      <div className={styles.coverFallback} aria-hidden="true">
        <Trophy size={66} strokeWidth={1} />
        <span>GAME LEGAL · FÚTBOL</span>
      </div>
      {source && (
        <Image
          src={source}
          alt={`Imagen oficial de ${tournament.name}`}
          fill
          unoptimized
          priority={priority}
          sizes="(max-width: 700px) 100vw, 50vw"
          onError={() => setFailed((previous) => [...previous, source])}
        />
      )}
      <span className={styles.coverShade} />
      <span
        className={`${styles.status} ${isDemo(tournament) ? styles.demoStatus : ""}`}
      >
        <span />
        {isDemo(tournament) ? "Torneo de demostración" : "Liga activa"}
      </span>
      <span className={styles.coverArrow} aria-hidden="true">
        <ArrowUpRight size={21} />
      </span>
    </div>
  );
}

export default function PortalPrincipal() {
  const router = useRouter();
  const loginDialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "official" | "demo">("all");
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const imageDialog = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const demo = tournaments.find(isDemo);
  const selectedShowcase = SHOWCASE[showcaseIndex];
  const visible = useMemo(
    () =>
      tournaments.filter((t) => {
        const query = search
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        const name = t.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return (
          name.includes(query) &&
          (filter === "all" || (filter === "demo" ? isDemo(t) : !isDemo(t)))
        );
      }),
    [tournaments, search, filter],
  );

  const loadTournaments = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError(false);
    try {
      const result = await supabase
        .from("tournaments")
        .select("id,name,slug,status,created_at,banner_url,poster_url")
        .order("created_at", { ascending: false })
        .abortSignal(controller.signal);
      if (requestRef.current !== controller) return;
      if (result.error) throw result.error;
      setTournaments(
        (result.data || []).filter(
          (t) =>
            t.slug &&
            (isDemo(t) ||
              !["finished", "archived", "deleted"].includes(
                t.status || "active",
              )),
        ),
      );
    } catch {
      if (requestRef.current === controller) setError(true);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTournaments();
    void track("landing_view");
    void (async () => {
      try {
        await supabase.from("status_visits").insert([{}]);
      } catch {
        /* Non-blocking visit count. */
      }
    })();
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
      data.subscription.unsubscribe();
    };
  }, [loadTournaments]);

  const contact = (source: string, plan?: string) =>
    void track("whatsapp_lead_click", { source, ...(plan ? { plan } : {}) });
  const demoClick = (source: string) =>
    demo &&
    void track("demo_open", {
      tournament_id: demo.id,
      tournament_name: demo.name,
      source,
    });
  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setAuthMessage(
          "No pudimos iniciar sesión. Revisa tu correo y contraseña.",
        );
        return;
      }
      router.push("/dashboard/torneos");
    } catch {
      setAuthMessage("No pudimos conectar. Intenta nuevamente.");
    } finally {
      setAuthLoading(false);
    }
  };
  const recoverPassword = async () => {
    if (!email) {
      setAuthMessage(
        "Ingresa tu correo para recibir el enlace de recuperación.",
      );
      return;
    }
    setAuthLoading(true);
    setAuthMessage("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/dashboard` },
      );
      setAuthMessage(
        resetError
          ? "No pudimos enviar el enlace. Intenta nuevamente."
          : "Revisa tu correo para continuar con la recuperación.",
      );
    } catch {
      setAuthMessage("No pudimos conectar. Intenta nuevamente.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#torneos">
        Ir a las ligas
      </a>
      <div
        className={styles.ticker}
        aria-label="Game Legal: donde nacen las leyendas"
      >
        <div className={styles.tickerTrack}>
          {[0, 1].map((n) => (
            <span key={n} aria-hidden={n === 1}>
              <Trophy size={13} /> DONDE NACEN LAS LEYENDAS <span>✦</span>{" "}
              FÚTBOL, COMUNIDAD Y PASIÓN <span>✦</span> TU TORNEO. TU HISTORIA.{" "}
              <span>✦</span>
            </span>
          ))}
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.navInner}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="Game Legal, inicio"
          >
            <span className={styles.brandIcon}>
              <Trophy size={23} strokeWidth={1.6} />
            </span>
            <span>
              GAME<span className={styles.brandGold}>LEGAL</span>
              <small>LA CASA DIGITAL DEL FÚTBOL</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navegación principal">
            <a href="#torneos">Ligas</a>
            <a href="#plataforma">Plataforma</a>
            <a href="#planes">Planes</a>
          </nav>
          <button
            className={styles.navAccess}
            onClick={() =>
              signedIn
                ? router.push("/dashboard/torneos")
                : loginDialog.current?.showModal()
            }
          >
            {signedIn ? "Ir a mi panel" : "Acceso organizador"}
            <ArrowUpRight size={16} />
          </button>
        </div>
      </header>
      <main>
        <section
          id="torneos"
          className={`${styles.directory} ${styles.container}`}
          aria-labelledby="league-title"
        >
          <div className={styles.directoryHeading}>
            <div>
              <p className={styles.eyebrow}>
                <span className={styles.liveDot} /> EL FÚTBOL DE TU COMUNIDAD
              </p>
              <h1 id="league-title">
                Tu liga.
                <br />
                <span>Tu pasión.</span>
              </h1>
            </div>
            <div className={styles.directoryIntro}>
              <span className={styles.chapter}>01 / EN LA CANCHA</span>
              <p>
                La emoción no termina con el pitazo.
                <br />
                Sigue tu campeonato, encuentra los resultados
                <br className={styles.desktopBreak} /> y acompaña a tu equipo
                hasta el final.
              </p>
              <a href="#plataforma">
                ¿Organizas un torneo? Conoce Game Legal <ArrowDown size={15} />
              </a>
            </div>
            <div className={styles.pitchDecoration} aria-hidden="true">
              <div />
              <span />
            </div>
          </div>
          <div className={styles.directoryToolbar}>
            <div className={styles.filters} aria-label="Filtrar campeonatos">
              <button
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Ligas activas{" "}
                <span>{loading || error ? "—" : tournaments.length}</span>
              </button>
              <button
                aria-pressed={filter === "official"}
                onClick={() => setFilter("official")}
              >
                Oficiales
              </button>
              <button
                aria-pressed={filter === "demo"}
                onClick={() => setFilter("demo")}
              >
                Demo
              </button>
            </div>
            <label className={styles.search}>
              <Search size={17} />
              <span className={styles.srOnly}>Buscar un campeonato</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Encuentra tu campeonato"
              />
            </label>
          </div>
          <div aria-live="polite" aria-busy={loading}>
            {loading ? (
              <div className={styles.leagueGrid}>
                <div className={styles.skeleton}>Cargando campeonatos…</div>
                <div className={styles.skeleton} aria-hidden="true" />
              </div>
            ) : error ? (
              <div className={styles.empty}>
                <Trophy size={30} />
                <h2>Volvemos a la cancha en un momento.</h2>
                <p>No pudimos cargar los campeonatos. Intenta nuevamente.</p>
                <button
                  className={styles.secondaryButton}
                  onClick={() => void loadTournaments()}
                >
                  Volver a intentar <ArrowRight size={16} />
                </button>
              </div>
            ) : visible.length ? (
              <div className={styles.leagueGrid}>
                {visible.map((tournament, index) => (
                  <Link
                    key={tournament.id}
                    href={`/torneo/${tournament.slug}`}
                    className={styles.leagueCard}
                    onClick={() =>
                      void track("public_tournament_open", {
                        tournament_id: tournament.id,
                        tournament_name: tournament.name,
                        source: "directory",
                      })
                    }
                  >
                    <Cover tournament={tournament} priority={index < 2} />
                    <div className={styles.leagueInfo}>
                      <div className={styles.leagueMeta}>
                        <span>
                          {isDemo(tournament)
                            ? "EXPLORA LA PLATAFORMA"
                            : "SIGUE TU CAMPEONATO"}
                        </span>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <h2>{tournament.name.trim()}</h2>
                      <div className={styles.leagueBottom}>
                        <span>
                          {isDemo(tournament)
                            ? "Demo con datos ficticios"
                            : "Partidos · Posiciones · Goleadores"}
                        </span>
                        <strong>
                          {isDemo(tournament)
                            ? "Explorar demo"
                            : "Entrar a la liga"}
                          <ArrowRight size={16} />
                        </strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <Search size={28} />
                <h2>
                  {tournaments.length
                    ? "No encontramos ese campeonato."
                    : "La próxima historia está por empezar."}
                </h2>
                <p>
                  {tournaments.length
                    ? "Prueba otro nombre o cambia el filtro."
                    : "Aquí aparecerán los campeonatos disponibles."}
                </p>
                {tournaments.length > 0 && (
                  <button
                    className={styles.secondaryButton}
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Ver todos los campeonatos
                  </button>
                )}
              </div>
            )}
          </div>
          <div className={styles.directoryFoot}>
            <span>
              <ShieldCheck size={15} /> Información publicada por cada
              organizador
            </span>
            <span>
              EL PARTIDO SIGUE AQUÍ <ArrowDown size={14} />
            </span>
          </div>
        </section>
        <section
          id="plataforma"
          className={styles.platform}
          aria-labelledby="platform-title"
        >
          <div className={styles.arenaArt}>
            <Image
              src="/landing/game-legal-arena.webp"
              alt="Ilustración de un estadio de fútbol iluminado en tonos dorados"
              fill
              sizes="(max-width: 800px) 100vw, 85vw"
            />
          </div>
          <div className={`${styles.container} ${styles.platformInner}`}>
            <p className={styles.eyebrow}>
              <Sparkles size={14} /> PARA QUIENES HACEN POSIBLE EL JUEGO
            </p>
            <h2 id="platform-title">
              Tu torneo
              <br />
              merece jugar
              <br />
              <span>en grande.</span>
            </h2>
            <p className={styles.platformDescription}>
              Tú pones la pasión. Game Legal te da el control.
              <br />
              Organiza, gestiona y comparte tu campeonato
              <br className={styles.desktopBreak} /> con una presencia a la
              altura de tu comunidad.
            </p>
            <div className={styles.actions}>
              <a
                className={styles.primaryButton}
                href={whatsapp(
                  "Hola, quiero organizar mi torneo con Game Legal. Me gustaría una demostración.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => contact("platform")}
              >
                Quiero organizar mi torneo <ArrowUpRight size={18} />
              </a>
              <a
                href={demo ? `/torneo/${demo.slug}` : "#experiencia"}
                className={styles.textButton}
                onClick={() => demoClick("platform")}
              >
                <CirclePlay size={21} /> Ver la demostración
              </a>
            </div>
            <p className={styles.microcopy}>
              Conoce la plataforma y solicita una propuesta para tu campeonato.
            </p>
            <div className={styles.arenaLabel} aria-hidden="true">
              <span className={styles.liveDot} />
              <span>
                UNA SOLA PLATAFORMA.
                <br />
                <strong>TODO TU CAMPEONATO.</strong>
              </span>
              <Trophy size={24} />
            </div>
          </div>
          <div className={`${styles.container} ${styles.featureStrip}`}>
            {[
              {
                icon: CalendarDays,
                title: "Organiza",
                text: "Grupos, canchas y calendario",
              },
              {
                icon: Users,
                title: "Gestiona",
                text: "Equipos, jugadores y finanzas",
              },
              {
                icon: ArrowUpRight,
                title: "Comparte",
                text: "Resultados y página pública",
              },
            ].map((item, i) => (
              <div key={item.title}>
                <span className={styles.featureNumber}>0{i + 1}</span>
                <item.icon size={23} strokeWidth={1.4} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section
          id="experiencia"
          className={`${styles.container} ${styles.experience}`}
          aria-labelledby="experience-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>02 / ASÍ SE VE TU PRÓXIMO NIVEL</p>
              <h2 id="experience-title">
                Se nota en la cancha.
                <br />
                <span>Y fuera de ella.</span>
              </h2>
            </div>
            <p>
              Una identidad que se reconoce.
              <br />
              Información que se entiende.
              <br />
              Contenido que tu comunidad quiere compartir.
            </p>
          </div>
          <div className={styles.showcase}>
            <div className={styles.showcaseContent}>
              <div
                className={styles.showcaseTabs}
                aria-label="Vistas de la plataforma"
              >
                {SHOWCASE.map((item, index) => (
                  <button
                    key={item.title}
                    onClick={() => setShowcaseIndex(index)}
                    aria-pressed={index === showcaseIndex}
                  >
                    <item.icon size={18} />
                    {item.title}
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <div className={styles.showcaseCopy}>
                <span className={styles.chapter}>HECHO CON GAME LEGAL</span>
                <h3>{selectedShowcase.subtitle}</h3>
                <p>{selectedShowcase.description}</p>
                {demo && (
                  <Link
                    href={`/torneo/${demo.slug}`}
                    onClick={() => demoClick("showcase")}
                    className={styles.textButton}
                  >
                    Explorar el torneo demo <ArrowUpRight size={17} />
                  </Link>
                )}
                <small>
                  Material de Champions Loxa 2026.
                  <br />
                  Demostración con datos ficticios.
                </small>
              </div>
            </div>
            <button
              className={styles.showcaseVisual}
              aria-label={`Ampliar ejemplo de ${selectedShowcase.title}`}
              onClick={() => imageDialog.current?.showModal()}
            >
              <div className={styles.showcaseOrbit} aria-hidden="true" />
              <Image
                key={selectedShowcase.image}
                src={selectedShowcase.image}
                alt={`Ejemplo de ${selectedShowcase.title} generado en Champions Loxa 2026`}
                width={540}
                height={720}
                sizes="(max-width: 700px) 80vw, 420px"
              />
              <span className={styles.expandLabel}>
                VER EN DETALLE <ArrowUpRight size={14} />
              </span>
            </button>
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.workflow}`}
          aria-labelledby="workflow-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>
                03 / DEL PRIMER SORTEO AL ÚLTIMO GOL
              </p>
              <h2 id="workflow-title">
                Más fútbol.
                <br />
                <span>Menos complicaciones.</span>
              </h2>
            </div>
            <a
              className={styles.secondaryButton}
              href={whatsapp(
                "Hola, quiero conocer cómo poner en marcha mi campeonato en Game Legal.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => contact("workflow")}
            >
              Hablemos de tu torneo <ArrowUpRight size={17} />
            </a>
          </div>
          <div className={styles.workflowGrid}>
            {[
              {
                icon: Layers3,
                title: "Dale forma a tu torneo",
                text: "Define el formato, los grupos, las reglas y la identidad visual. Todo empieza con una buena organización.",
                tags: ["Configuración", "Identidad"],
              },
              {
                icon: ShieldCheck,
                title: "Lleva el control",
                text: "Centraliza equipos, jugadores, partidos, sanciones y pagos. La información que necesitas para decidir.",
                tags: ["Gestión deportiva", "Finanzas"],
              },
              {
                icon: Goal,
                title: "Haz crecer la emoción",
                text: "Publica resultados, comparte posters y acerca las estadísticas a jugadores, aficionados y auspiciantes.",
                tags: ["Página pública", "Contenido"],
              },
            ].map((item, index) => (
              <article key={item.title}>
                <div className={styles.workflowTop}>
                  <item.icon size={30} strokeWidth={1.25} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className={styles.tags}>
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          id="planes"
          className={styles.plansSection}
          aria-labelledby="plans-title"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>04 / UN PLAN PARA TU AMBICIÓN</p>
                <h2 id="plans-title">
                  Empieza tu próxima
                  <br />
                  <span>gran temporada.</span>
                </h2>
              </div>
              <p>
                Cuéntanos el tamaño de tu campeonato.
                <br />
                Te proponemos el alcance y el acompañamiento
                <br className={styles.desktopBreak} /> que necesitas, con una
                cotización a medida.
              </p>
            </div>
            <div className={styles.plans}>
              {[
                {
                  name: "Básico",
                  description: "El primer paso hacia un campeonato organizado.",
                  items: [
                    "Un torneo activo",
                    "Equipos, jugadores y calendario",
                    "Resultados y tabla pública",
                    "Soporte de puesta en marcha",
                  ],
                },
                {
                  name: "Profesional",
                  description:
                    "Gestión y presencia para llevar tu liga más lejos.",
                  items: [
                    "Todo lo del plan Básico",
                    "Finanzas y estados de pago",
                    "Posters, planillas y carnets",
                    "Página pública personalizada",
                    "Soporte prioritario",
                  ],
                },
                {
                  name: "Premium",
                  description:
                    "Acompañamiento para organizaciones con más alcance.",
                  items: [
                    "Todo lo del plan Profesional",
                    "Múltiples torneos y colaboradores",
                    "Reportes y control comercial",
                    "Identidad visual avanzada",
                    "Acompañamiento preferencial",
                  ],
                },
              ].map((plan, index) => (
                <article
                  key={plan.name}
                  className={index === 1 ? styles.featuredPlan : ""}
                >
                  <div className={styles.planTop}>
                    <span>0{index + 1}</span>
                    {index === 1 && (
                      <span className={styles.recommended}>
                        GESTIÓN COMPLETA
                      </span>
                    )}
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <div className={styles.planPrice}>
                    A tu medida<span>Solicita tu cotización</span>
                  </div>
                  <ul>
                    {plan.items.map((item) => (
                      <li key={item}>
                        <Check size={15} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={whatsapp(
                      `Hola, deseo una propuesta del plan ${plan.name} de Game Legal para mi torneo.`,
                    )}
                    className={
                      index === 1
                        ? styles.primaryButton
                        : styles.secondaryButton
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => contact("commercial_plan", plan.name)}
                  >
                    Consultar plan <ArrowUpRight size={16} />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.faq}`}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.eyebrow}>ANTES DEL PITAZO INICIAL</p>
            <h2 id="faq-title">
              Todo empieza
              <br />
              con una buena
              <br />
              <span>conversación.</span>
            </h2>
          </div>
          <div>
            {[
              [
                "¿Puedo conocer la plataforma antes de contratar?",
                "Sí. Explora el torneo de demostración y sus vistas públicas. También puedes escribirnos para una demostración enfocada en las necesidades de tu campeonato.",
              ],
              [
                "¿Los aficionados necesitan una cuenta?",
                "La página pública de cada torneo permite consultar la información que publica el organizador. El acceso de administración está reservado a los usuarios autorizados.",
              ],
              [
                "¿Qué necesito para empezar?",
                "El nombre de tu torneo, el formato que quieres jugar y la información de los equipos. Escríbenos para definir el alcance y la puesta en marcha.",
              ],
              [
                "¿Cómo se define el valor del servicio?",
                "La propuesta depende del número de equipos y torneos, la duración y el acompañamiento requerido. Solicita una cotización para conocer las condiciones antes de contratar.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={`${styles.container} ${styles.finalCta}`}>
          <div className={styles.ctaPitch} aria-hidden="true">
            <div />
            <span />
          </div>
          <p className={styles.eyebrow}>TU COMUNIDAD ESTÁ LISTA</p>
          <h2>
            Haz que tu torneo
            <br />
            <span>deje huella.</span>
          </h2>
          <p>El siguiente capítulo de tu campeonato empieza aquí.</p>
          <a
            className={styles.primaryButton}
            href={whatsapp(
              "Hola, quiero llevar mi torneo al siguiente nivel con Game Legal. ¿Podemos conversar?",
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => contact("landing_cta")}
          >
            Conversemos por WhatsApp <ArrowUpRight size={18} />
          </a>
        </section>
        <section
          className={styles.sponsors}
          aria-label="Auspiciantes oficiales"
        >
          <p className={styles.eyebrow}>QUIENES TAMBIÉN HACEN EQUIPO</p>
          <SponsorMarquee sponsors={SPONSORS} />
        </section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}>
            <Trophy size={20} />
          </span>
          <span>
            GAME<span className={styles.brandGold}>LEGAL</span>
            <small>LA CASA DIGITAL DEL FÚTBOL</small>
          </span>
        </Link>
        <p>
          © {new Date().getFullYear()} Game Legal.
          <br />
          Pasión por el fútbol. Control para tu torneo.
        </p>
        <a href="#torneos">
          Volver a las ligas <ArrowUpRight size={16} />
        </a>
      </footer>
      <dialog
        ref={loginDialog}
        className={styles.loginDialog}
        aria-labelledby="login-title"
        onClick={(event) => {
          if (event.target === event.currentTarget)
            loginDialog.current?.close();
        }}
      >
        <button
          className={styles.closeDialog}
          aria-label="Cerrar acceso"
          onClick={() => loginDialog.current?.close()}
        >
          <X size={20} />
        </button>
        <Trophy className={styles.loginTrophy} size={32} strokeWidth={1.4} />
        <p className={styles.eyebrow}>ACCESO ORGANIZADOR</p>
        <h2 id="login-title">Tu torneo, bajo control.</h2>
        <p>Ingresa al panel de administración de Game Legal.</p>
        <form onSubmit={signIn}>
          <label htmlFor="landing-email">Correo electrónico</label>
          <input
            autoFocus
            id="landing-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
          />
          <label htmlFor="landing-password">Contraseña</label>
          <input
            id="landing-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className={styles.recoverButton}
            type="button"
            disabled={authLoading}
            onClick={() => void recoverPassword()}
          >
            ¿Olvidaste tu contraseña?
          </button>
          <p role="status" className={styles.authMessage}>
            {authMessage}
          </p>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={authLoading}
          >
            {authLoading ? "Un momento…" : "Entrar a mi panel"}
            <ArrowRight size={17} />
          </button>
        </form>
      </dialog>
      <dialog
        ref={imageDialog}
        className={styles.imageDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget)
            imageDialog.current?.close();
        }}
      >
        <button
          autoFocus
          aria-label="Cerrar imagen ampliada"
          onClick={() => imageDialog.current?.close()}
        >
          <X size={22} />
        </button>
        <Image
          src={selectedShowcase.image}
          alt={`Vista ampliada: ${selectedShowcase.title}. Torneo de demostración.`}
          width={900}
          height={1200}
          sizes="90vw"
        />
        <p>{selectedShowcase.title} · Champions Loxa 2026 · Datos ficticios</p>
      </dialog>
    </div>
  );
}
