"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type ThemeMode = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("gamelegal-theme") as ThemeMode | null;
    const next = stored === "light" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.publicTheme = next;
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("gamelegal-theme", next);
    document.documentElement.dataset.publicTheme = next;
  };

  return (
    <button type="button" onClick={toggleTheme} className="premium-theme-toggle" aria-label="Cambiar tema visual">
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      <span>{theme === "dark" ? "Dia" : "Noche"}</span>
    </button>
  );
}

export function HighEndNavbar({
  sessionActive,
  onLogin,
  onDashboard,
  tournamentName,
}: {
  sessionActive?: boolean;
  onLogin?: () => void;
  onDashboard?: () => void;
  tournamentName?: string;
}) {
  return (
    <nav className="premium-navbar">
      <Link href="/" className="premium-brand" aria-label="Game Legal Tournament">
        <span className="premium-brand-mark"><Trophy size={18} /></span>
        <span>
          <strong>Game Legal</strong>
          <small>{tournamentName || "Tournament OS"}</small>
        </span>
      </Link>
      <div className="premium-nav-actions">
        <ThemeToggle />
        {sessionActive ? (
          <button type="button" onClick={onDashboard} className="premium-nav-button">
            Panel <ArrowRight size={15} />
          </button>
        ) : (
          <button type="button" onClick={onLogin} className="premium-nav-button">
            Acceso <Shield size={15} />
          </button>
        )}
      </div>
    </nav>
  );
}

export function PublicTournamentLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="premium-public-shell">
      <div className="premium-field-grid" aria-hidden="true" />
      {children}
    </main>
  );
}

export function PremiumHero({
  eyebrow,
  title,
  highlight,
  description,
  primaryLabel,
  onPrimary,
  stats = [],
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  stats?: { label: string; value: string | number }[];
}) {
  return (
    <section className="premium-hero">
      <div className="premium-hero-copy">
        <span className="premium-eyebrow"><Sparkles size={16} /> {eyebrow}</span>
        <h1>
          {title}
          <span>{highlight}</span>
        </h1>
        <p>{description}</p>
        {primaryLabel && (
          <button type="button" onClick={onPrimary} className="premium-cta">
            {primaryLabel} <ArrowRight size={18} />
          </button>
        )}
      </div>
      <div className="premium-hero-board">
        <div className="scoreline">
          <span>GL</span>
          <strong>PRO</strong>
          <span>OS</span>
        </div>
        <div className="pitch-card">
          <div>
            <small>Competicion</small>
            <strong>En vivo</strong>
          </div>
          <Zap size={28} />
        </div>
        <AnimatedStatsBlock stats={stats} />
      </div>
    </section>
  );
}

export function PremiumSectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="premium-section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export function AnimatedStatsBlock({ stats }: { stats: { label: string; value: string | number }[] }) {
  return (
    <div className="premium-stats-grid">
      {stats.map((stat) => (
        <div className="premium-stat" key={stat.label}>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export function EliteTournamentCard({ tournament }: { tournament: any }) {
  return (
    <Link href={`/torneo/${tournament.slug}`} className="elite-tournament-card">
      <div>
        <span className="live-pill">En curso</span>
        <h3>{tournament.name || "Torneo Oficial"}</h3>
        <p>Posiciones, calendario, goleadores y comunicados oficiales.</p>
      </div>
      <div className="elite-card-footer">
        <Trophy size={20} />
        <span>Ver portal</span>
        <ChevronRight size={18} />
      </div>
    </Link>
  );
}

export function GlassMatchCard({ match }: { match: any }) {
  const finished = match.status === "finished";
  return (
    <article className="glass-match-card">
      <div className="match-meta">
        <span>{match.stage || "Fase de grupos"}</span>
        <span><CalendarDays size={13} /> Fecha {match.matchday || "-"}</span>
      </div>
      <div className="match-row">
        <TeamMini team={match.home} align="right" />
        <div className="match-score">{finished ? `${match.home_goals ?? 0} - ${match.away_goals ?? 0}` : "VS"}</div>
        <TeamMini team={match.away} align="left" />
      </div>
      {match.notes && <p className="match-notes">{match.notes}</p>}
    </article>
  );
}

function TeamMini({ team, align }: { team: any; align: "left" | "right" }) {
  return (
    <div className={`team-mini ${align}`}>
      {team?.shield_url ? (
        <Image src={team.shield_url} alt={team.name || "Equipo"} width={44} height={44} unoptimized />
      ) : (
        <span className="team-shield-fallback"><Shield size={20} /></span>
      )}
      <strong>{team?.name || "Equipo"}</strong>
    </div>
  );
}

export function PremiumStandingsTable({ groups }: { groups: Record<string, any[]> }) {
  const entries = Object.entries(groups);
  return (
    <div className="premium-table-wrap">
      {entries.length === 0 ? (
        <EmptyState text="Aun no existen posiciones registradas." />
      ) : (
        entries.map(([group, teams]) => (
          <div key={group} className="standings-group">
            <h3>Grupo {group}</h3>
            <div className="table-scroll">
              <table className="premium-standings-table">
                <thead>
                  <tr>
                    <th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, index) => (
                    <tr key={team.id}>
                      <td>{String(index + 1).padStart(2, "0")}</td>
                      <td><strong>{team.name}</strong></td>
                      <td>{team.pj}</td><td>{team.pg}</td><td>{team.pe}</td><td>{team.pp}</td>
                      <td>{team.gf}</td><td>{team.gc}</td><td>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                      <td><b>{team.pts}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function SponsorMarquee({ sponsors }: { sponsors: string[] }) {
  const list = sponsors.length ? sponsors : ["Game Legal", "Torneos Calib", "Multipagos San Sebastian"];
  return (
    <div className="sponsor-marquee">
      <div className="sponsor-track">
        {[...list, ...list].map((sponsor, index) => (
          <span key={`${sponsor}-${index}`}>{sponsor}</span>
        ))}
      </div>
    </div>
  );
}

export function PhotoGalleryGrid({ teams, players }: { teams?: any[]; players?: any[] }) {
  const photos = useMemo(() => {
    const teamPhotos = (teams || []).filter((item) => item.shield_url).slice(0, 6).map((item) => ({ src: item.shield_url, label: item.name }));
    const playerPhotos = (players || []).filter((item) => item.photo_url).slice(0, 6).map((item) => ({ src: item.photo_url, label: item.full_name }));
    return [...teamPhotos, ...playerPhotos].slice(0, 8);
  }, [teams, players]);

  if (!photos.length) {
    return <EmptyState text="La galeria se activara cuando existan escudos o fotos de jugadores." />;
  }

  return (
    <div className="photo-gallery-grid">
      {photos.map((photo, index) => (
        <figure key={`${photo.src}-${index}`}>
          <Image src={photo.src} alt={photo.label || "Imagen del torneo"} width={420} height={300} unoptimized />
          <figcaption>{photo.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function HighEndFooter() {
  return (
    <footer className="highend-footer">
      <strong>Game Legal Tournament</strong>
      <span>Plataforma deportiva profesional para torneos competitivos.</span>
    </footer>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="premium-empty">
      <Users size={28} />
      <p>{text}</p>
    </div>
  );
}
