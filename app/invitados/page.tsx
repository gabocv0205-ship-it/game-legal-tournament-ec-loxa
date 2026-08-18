"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SponsorMarquee } from "@/components/SponsorMarquee";

type TableEntry = { pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; pts: number; shield: string | null };
type TableRow = [string, TableEntry];

const PLATFORM_SPONSORS = [
  "Dra. Gina Calva - Notaría Primera Del Cantón Loja",
  "Dr. Alex Ávila",
  "Game-Legal Estudio Jurídico Virtual",
  "Cafetería Coffee Time",
  "Mister Copy",
  "Botanitas Express",
  "Torneos Calib",
  "Multipagos San Sebastián",
];

export default function PortalInvitados() {
  const [tabla, setTabla] = useState<TableRow[]>([]);
  const [partidosJugados, setPartidosJugados] = useState(0);
  const [partidosPendientes, setPartidosPendientes] = useState(0);

  useEffect(() => {
    const sincronizarTabla = () => {
      try {
        const guardados = localStorage.getItem("gl_partidos");
        const partidos = guardados ? JSON.parse(guardados) : [];
        if (!Array.isArray(partidos)) return;

        const temporal: Record<string, TableEntry> = {};
        let jugados = 0;
        let pendientes = 0;
        partidos.forEach((partido: any) => {
          if (!partido.jugado) { pendientes += 1; return; }
          jugados += 1;
          if (!temporal[partido.local]) temporal[partido.local] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, shield: partido.localShield || null };
          if (!temporal[partido.visitante]) temporal[partido.visitante] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, shield: partido.visitanteShield || null };
          const local = temporal[partido.local];
          const visitante = temporal[partido.visitante];
          const golesLocal = Number(partido.gl || 0);
          const golesVisitante = Number(partido.gv || 0);
          local.pj += 1; visitante.pj += 1;
          local.gf += golesLocal; local.gc += golesVisitante;
          visitante.gf += golesVisitante; visitante.gc += golesLocal;
          if (golesLocal > golesVisitante) { local.pts += 3; local.pg += 1; visitante.pp += 1; }
          else if (golesVisitante > golesLocal) { visitante.pts += 3; visitante.pg += 1; local.pp += 1; }
          else { local.pts += 1; visitante.pts += 1; local.pe += 1; visitante.pe += 1; }
        });
        setPartidosJugados(jugados);
        setPartidosPendientes(pendientes);
        setTabla(Object.entries(temporal).sort(([, a], [, b]) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf) as TableRow[]);
      } catch {
        setTabla([]); setPartidosJugados(0); setPartidosPendientes(0);
      }
    };
    sincronizarTabla();
    window.addEventListener("storage", sincronizarTabla);
    return () => window.removeEventListener("storage", sincronizarTabla);
  }, []);

  const leader = useMemo(() => tabla[0], [tabla]);
  const bestAttack = useMemo(() => [...tabla].sort(([, a], [, b]) => b.gf - a.gf)[0], [tabla]);
  const bestDefense = useMemo(() => [...tabla].filter(([, row]) => row.pj > 0).sort(([, a], [, b]) => a.gc - b.gc)[0], [tabla]);

  return (
    <main className="guest-portal">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{ __html: `
        .guest-portal { --g-gold:#d7ad35; --g-ink:#07120c; --g-night:#07130e; --g-surface:rgba(13,29,21,.82); --g-line:rgba(215,173,53,.22); min-height:100vh; overflow:hidden; background:radial-gradient(circle at 80% 4%, rgba(215,173,53,.15), transparent 28%), radial-gradient(circle at 8% 45%, rgba(24,151,80,.22), transparent 30%), var(--g-night); color:#f8fff9; font-family:Inter,Segoe UI,Arial,sans-serif; }
        .guest-portal *, .guest-portal *::before, .guest-portal *::after { box-sizing:border-box; }
        .guest-ticker { overflow:hidden; border-bottom:1px solid rgba(255,255,255,.1); background:#061009; color:#e8f3e9; font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; white-space:nowrap; }
        .guest-ticker span { display:inline-block; min-width:100%; padding:12px 0; animation:guest-ticker 28s linear infinite; }
        @keyframes guest-ticker { from { transform:translateX(100%); } to { transform:translateX(-100%); } }
        .guest-nav { width:min(1180px,calc(100% - 32px)); margin:0 auto; padding:20px 0; display:flex; align-items:center; justify-content:space-between; gap:16px; }
        .guest-brand { display:flex; align-items:center; gap:11px; color:white; text-decoration:none; }
        .guest-brand-mark { width:42px; height:42px; display:grid; place-items:center; border:1px solid rgba(215,173,53,.5); border-radius:13px; background:linear-gradient(145deg,#233d2c,#0a130e); color:var(--g-gold); box-shadow:0 10px 30px rgba(0,0,0,.32); }
        .guest-brand strong { display:block; font-size:14px; letter-spacing:.13em; }.guest-brand small { display:block; margin-top:3px; color:#aabdb0; font-size:9px; font-weight:800; letter-spacing:.16em; }
        .guest-nav-actions { display:flex; gap:10px; align-items:center; }.guest-nav-link { min-height:40px; display:inline-flex; align-items:center; justify-content:center; padding:0 15px; border-radius:999px; border:1px solid var(--g-line); color:#eaf7ed; font-size:11px; font-weight:900; letter-spacing:.08em; text-decoration:none; text-transform:uppercase; transition:.2s ease; }.guest-nav-link:hover { transform:translateY(-2px); border-color:var(--g-gold); }.guest-nav-link.primary { background:var(--g-gold); color:#10160f; border-color:var(--g-gold); }
        .guest-hero { position:relative; width:min(1180px,calc(100% - 32px)); margin:0 auto; padding:clamp(58px,9vw,118px) 0 clamp(48px,7vw,82px); display:grid; grid-template-columns:minmax(0,1.1fr) minmax(330px,.9fr); gap:42px; align-items:center; }
        .guest-hero::before { content:''; position:absolute; z-index:0; width:620px; height:620px; right:-220px; top:-155px; border:1px solid rgba(215,173,53,.13); border-radius:50%; box-shadow:0 0 0 46px rgba(215,173,53,.025), 0 0 0 92px rgba(61,233,137,.018); pointer-events:none; }.guest-hero > * { position:relative; z-index:1; }
        .guest-eyebrow { display:inline-flex; gap:9px; align-items:center; padding:8px 12px; color:#f2d27a; border:1px solid rgba(215,173,53,.38); background:rgba(215,173,53,.08); border-radius:999px; font-size:10px; font-weight:900; letter-spacing:.17em; text-transform:uppercase; }.guest-live-dot { width:7px; height:7px; border-radius:50%; background:#3de989; box-shadow:0 0 0 6px rgba(61,233,137,.11); }
        .guest-title { max-width:740px; margin:22px 0 18px; font-size:clamp(48px,8vw,96px); font-weight:950; letter-spacing:-.075em; line-height:.88; text-transform:uppercase; }.guest-title em { color:var(--g-gold); font-style:normal; }.guest-copy { max-width:570px; margin:0; color:#aabdb0; font-size:clamp(15px,2vw,18px); line-height:1.7; }
        .guest-hero-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:30px; }
        .guest-live-card { position:relative; overflow:hidden; isolation:isolate; border:1px solid rgba(215,173,53,.48); border-radius:30px; padding:28px; background:linear-gradient(145deg,rgba(24,61,41,.95),rgba(6,16,10,.98)); box-shadow:0 30px 80px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.07); }.guest-live-card::before { content:''; position:absolute; z-index:-1; inset:auto -24% -45% auto; width:270px; height:270px; border:1px solid rgba(215,173,53,.21); border-radius:50%; }.guest-live-card::after { content:'GL'; position:absolute; z-index:-1; right:18px; top:10px; color:rgba(215,173,53,.08); font-size:112px; line-height:1; font-weight:950; letter-spacing:-.13em; }.guest-card-label { color:#efcf71; font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; }.guest-leader { display:flex; align-items:center; gap:14px; margin:18px 0 24px; }.guest-shield { width:62px; height:62px; display:grid; place-items:center; overflow:hidden; border:1px solid rgba(255,255,255,.17); border-radius:19px; background:rgba(255,255,255,.06); color:var(--g-gold); }.guest-leader strong { display:block; color:white; font-size:22px; text-transform:uppercase; }.guest-leader span { display:block; margin-top:5px; color:#b6cabd; font-size:12px; font-weight:800; }.guest-live-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }.guest-live-stats div { border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:12px; background:rgba(0,0,0,.15); }.guest-live-stats strong { display:block; color:white; font-size:23px; }.guest-live-stats span { display:block; margin-top:4px; color:#9bb1a2; font-size:9px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
        .guest-signal-strip { width:min(1180px,calc(100% - 32px)); margin:0 auto; display:grid; grid-template-columns:1.2fr repeat(3,1fr); overflow:hidden; border:1px solid rgba(215,173,53,.26); border-radius:21px; background:rgba(255,255,255,.035); }.guest-signal-main,.guest-signal-item { display:flex; min-height:84px; align-items:center; gap:13px; padding:16px 20px; }.guest-signal-main { color:#fff; border-right:1px solid rgba(255,255,255,.08); background:linear-gradient(100deg,rgba(215,173,53,.13),transparent); }.guest-signal-main i { color:var(--g-gold); font-size:23px; }.guest-signal-main small,.guest-signal-item small { display:block; color:#91a99a; font-size:9px; font-weight:900; letter-spacing:.13em; text-transform:uppercase; }.guest-signal-main strong,.guest-signal-item strong { display:block; margin-top:4px; color:#fff; font-size:13px; text-transform:uppercase; }.guest-signal-item { border-right:1px solid rgba(255,255,255,.08); }.guest-signal-item:last-child { border:0; }.guest-signal-number { color:var(--g-gold); font-size:27px; font-weight:950; letter-spacing:-.08em; }
        .guest-section { padding:clamp(70px,9vw,118px) 16px; margin-top:clamp(50px,7vw,82px); border-top:1px solid rgba(255,255,255,.07); background:linear-gradient(180deg,rgba(255,255,255,.018),transparent 55%); }.guest-section-inner { width:min(1180px,100%); margin:0 auto; }.guest-section-head { display:flex; align-items:end; justify-content:space-between; gap:24px; margin-bottom:30px; }.guest-kicker { color:var(--g-gold); font-size:10px; font-weight:900; letter-spacing:.2em; text-transform:uppercase; }.guest-section h2 { max-width:650px; margin:8px 0 0; color:white; font-size:clamp(31px,5vw,52px); letter-spacing:-.055em; line-height:1; text-transform:uppercase; }.guest-section-note { max-width:300px; color:#98ad9e; font-size:13px; line-height:1.6; }
        .guest-table-shell { overflow:hidden; border:1px solid var(--g-line); border-radius:24px; background:rgba(9,24,16,.75); box-shadow:0 24px 60px rgba(0,0,0,.2); }.guest-table-top { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:19px 22px; border-bottom:1px solid rgba(255,255,255,.08); }.guest-table-top strong { color:white; font-size:13px; letter-spacing:.1em; text-transform:uppercase; }.guest-status { display:inline-flex; align-items:center; gap:7px; color:#74eda7; font-size:10px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }.guest-status i { width:7px; height:7px; border-radius:50%; background:#3de989; }
        .guest-table-scroll { overflow-x:auto; }.guest-table { width:100%; min-width:700px; border-collapse:collapse; }.guest-table th { padding:14px 16px; color:#829888; font-size:10px; font-weight:900; letter-spacing:.13em; text-align:center; text-transform:uppercase; }.guest-table th:nth-child(2), .guest-table td:nth-child(2) { text-align:left; }.guest-table td { padding:15px 16px; border-top:1px solid rgba(255,255,255,.06); color:#dce9df; font-size:13px; font-weight:800; text-align:center; }.guest-table tbody tr { transition:background .2s ease; }.guest-table tbody tr:hover { background:rgba(215,173,53,.06); }.guest-position { display:inline-grid; width:27px; height:27px; place-items:center; border-radius:9px; color:#9eb0a3; background:rgba(255,255,255,.06); font-size:11px; }.guest-position.first { background:var(--g-gold); color:#172015; }.guest-team { display:flex; min-width:190px; align-items:center; gap:10px; color:white; text-transform:uppercase; }.guest-team-shield { width:32px; height:32px; display:grid; flex:0 0 auto; place-items:center; overflow:hidden; border-radius:10px; background:rgba(255,255,255,.08); color:var(--g-gold); }.guest-points { color:#f3d26f !important; font-size:17px !important; }.guest-empty { padding:48px; color:#9cb0a0; text-align:center; }
        .guest-sponsors { padding:52px 16px 28px; background:linear-gradient(180deg,rgba(255,255,255,.025),transparent); border-top:1px solid rgba(255,255,255,.07); }.guest-sponsors p { margin:0; color:#9ab09e; font-size:10px; font-weight:900; letter-spacing:.18em; text-align:center; text-transform:uppercase; }.guest-sponsors .sponsor-marquee { margin-top:13px; }.guest-sponsors .sponsor-marquee-item { border-color:rgba(215,173,53,.25); background:rgba(255,255,255,.04); color:#dce9df; }
        .guest-footer { display:flex; width:min(1180px,calc(100% - 32px)); margin:0 auto; padding:28px 0 40px; align-items:center; justify-content:space-between; gap:16px; color:#819486; font-size:12px; }.guest-footer strong { color:#e6d39a; letter-spacing:.13em; text-transform:uppercase; }
        @media (max-width:780px) { .guest-nav { padding:16px 0; }.guest-nav-link:not(.primary) { display:none; }.guest-hero { grid-template-columns:1fr; padding-top:56px; }.guest-live-card { max-width:520px; }.guest-signal-strip { grid-template-columns:1fr 1fr; }.guest-signal-main { grid-column:1/-1; border-right:0; border-bottom:1px solid rgba(255,255,255,.08); }.guest-signal-item:nth-child(3) { border-right:0; }.guest-signal-item:last-child { display:none; }.guest-section-head { align-items:start; flex-direction:column; }.guest-section-note { max-width:600px; }.guest-footer { align-items:flex-start; flex-direction:column; }.guest-title { font-size:clamp(45px,15vw,72px); } }
        @media (prefers-reduced-motion:reduce) { .guest-ticker span { animation:none; padding-left:16px; } }
      ` }} />

      <div className="guest-ticker"><span>GAME LEGAL TOURNAMENT · RESULTADOS, POSICIONES Y NOVEDADES OFICIALES · LA PASIÓN SE VIVE EN LA CANCHA</span></div>
      <nav className="guest-nav">
        <Link href="/" className="guest-brand"><span className="guest-brand-mark"><i className="fa fa-trophy" /></span><span><strong>Game-Legal</strong><small>Experiencia deportiva oficial</small></span></Link>
        <div className="guest-nav-actions"><Link href="/#torneos" className="guest-nav-link">Torneos</Link><Link href="/dashboard" className="guest-nav-link primary">Acceso organizador</Link></div>
      </nav>

      <section className="guest-hero">
        <div>
          <div className="guest-eyebrow"><span className="guest-live-dot" />Competición en vivo · Loja</div>
          <h1 className="guest-title">Toda la emoción.<br /><em>Una sola cancha.</em></h1>
          <p className="guest-copy">Consulta las posiciones oficiales, resultados y el avance de cada equipo en una experiencia clara, confiable y pensada para la afición.</p>
          <div className="guest-hero-actions"><a href="#posiciones" className="guest-nav-link primary">Ver tabla en vivo</a><Link href="/" className="guest-nav-link">Explorar torneos</Link></div>
        </div>
        <aside className="guest-live-card" aria-label="Resumen de la competición">
          <p className="guest-card-label">Líder actual</p>
          <div className="guest-leader"><span className="guest-shield">{leader?.[1].shield ? <Image src={leader[1].shield} alt="Escudo del líder" width={62} height={62} unoptimized className="h-full w-full object-contain p-1" /> : <i className="fa fa-shield-halved" />}</span><div><strong>{leader?.[0] || "Próximamente"}</strong><span>{leader ? `${leader[1].pts} puntos · GD ${leader[1].gf - leader[1].gc}` : "Esperando resultados oficiales"}</span></div></div>
          <div className="guest-live-stats"><div><strong>{tabla.length}</strong><span>Equipos</span></div><div><strong>{partidosJugados}</strong><span>Jugados</span></div><div><strong>{partidosPendientes}</strong><span>Por jugar</span></div></div>
        </aside>
      </section>

      <section className="guest-signal-strip" aria-label="Pulso de la competición">
        <div className="guest-signal-main"><i className="fa fa-bolt" /><div><small>Centro de competición</small><strong>Resultados y posiciones oficiales</strong></div></div>
        <div className="guest-signal-item"><span className="guest-signal-number">{leader?.[1].pts || 0}</span><div><small>Puntos líderes</small><strong>{leader?.[0] || "Por definir"}</strong></div></div>
        <div className="guest-signal-item"><span className="guest-signal-number">{bestAttack?.[1].gf || 0}</span><div><small>Mayor ataque</small><strong>{bestAttack?.[0] || "Por definir"}</strong></div></div>
        <div className="guest-signal-item"><span className="guest-signal-number">{bestDefense?.[1].gc ?? "-"}</span><div><small>Mejor defensa</small><strong>{bestDefense?.[0] || "Por definir"}</strong></div></div>
      </section>

      <section id="posiciones" className="guest-section">
        <div className="guest-section-inner">
          <div className="guest-section-head"><div><p className="guest-kicker">Centro de resultados</p><h2>Tabla de <span style={{ color: "var(--g-gold)" }}>posiciones</span></h2></div><p className="guest-section-note">Los resultados publicados actualizan el orden automáticamente por puntos, diferencia de gol y goles a favor.</p></div>
          <div className="guest-table-shell">
            <div className="guest-table-top"><strong><i className="fa fa-trophy" style={{ color: "var(--g-gold)", marginRight: 9 }} />Clasificación oficial</strong><span className="guest-status"><i />En actualización</span></div>
            <div className="guest-table-scroll"><table className="guest-table"><thead><tr><th>Pos</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>GD</th><th>Pts</th></tr></thead><tbody>{tabla.length === 0 ? <tr><td colSpan={10} className="guest-empty">Aún no existen resultados publicados para esta competencia.</td></tr> : tabla.map(([nombre, fila], index) => { const gd = fila.gf - fila.gc; return <tr key={nombre}><td><span className={`guest-position ${index === 0 ? "first" : ""}`}>{index + 1}</span></td><td><span className="guest-team"><span className="guest-team-shield">{fila.shield ? <Image src={fila.shield} alt="" width={32} height={32} unoptimized className="h-full w-full object-contain p-1" /> : <i className="fa fa-shield-halved" />}</span>{nombre}</span></td><td>{fila.pj}</td><td>{fila.pg}</td><td>{fila.pe}</td><td>{fila.pp}</td><td>{fila.gf}</td><td>{fila.gc}</td><td>{gd > 0 ? `+${gd}` : gd}</td><td className="guest-points">{fila.pts}</td></tr>; })}</tbody></table></div>
          </div>
        </div>
      </section>

      <section className="guest-sponsors"><p>Auspiciantes oficiales</p><SponsorMarquee sponsors={PLATFORM_SPONSORS} /></section>
      <footer className="guest-footer"><strong>Game-Legal Tournament</strong><span>Información oficial para jugadores, equipos y afición.</span></footer>
    </main>
  );
}
