"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import Link from 'next/link'; 

export default function PortalTorneoDinamico() {
  const router = useRouter();
  const params = useParams(); 
  const slug = params.slug;

  const [torneoActual, setTorneoActual] = useState<any>(null);
  const [tabla, setTabla] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [visitas, setVisitas] = useState(0);
  const [activeTab, setActiveTab] = useState("posiciones");
  const [errorTorneo, setErrorTorneo] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Lógica de carga de datos INTACTA
  useEffect(() => {
    async function inicializarPortal() {
      try {
        if (!slug) return;

        await supabase.from("status_visits").insert([{}]);
        const { count } = await supabase.from("status_visits").select("*", { count: "exact", head: true });
        if (count) setVisitas(count);

        const { data: tourney } = await supabase.from("tournaments").select("*").eq("slug", slug).single();
        
        if (!tourney) {
          setErrorTorneo(true);
          return;
        }

        setTorneoActual(tourney);

        const { data: teams } = await supabase.from("teams").select("*").eq("tournament_id", tourney.id);
        setEquipos(teams || []);
        const { data: matches } = await supabase.from("matches")
          .select("*, home:home_team_id(id, name, shield_url), away:away_team_id(id, name, shield_url)")
          .eq("tournament_id", tourney.id)
          .order("match_date", { ascending: true });
        
        setPartidos(matches || []);

        const stats: Record<string, any> = {};
        teams?.forEach(t => {
          stats[t.id] = { id: t.id, name: t.name, shield: t.shield_url, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
        });

        matches?.filter(m => m.status === 'finished' && m.stage === 'Fase de Grupos').forEach(m => {
          const hId = m.home_team_id; const aId = m.away_team_id;
          const hG = m.home_goals || 0; const aG = m.away_goals || 0;
          if (stats[hId] && stats[aId]) {
            stats[hId].pj++; stats[aId].pj++;
            stats[hId].gf += hG; stats[aId].gf += aG;
            stats[hId].gc += aG; stats[aId].gc += hG;
            if (hG > aG) { stats[hId].pg++; stats[hId].pts += 3; stats[aId].pp++; }
            else if (aG > hG) { stats[aId].pg++; stats[aId].pts += 3; stats[hId].pp++; }
            else { stats[hId].pe++; stats[hId].pts += 1; stats[aId].pe++; stats[aId].pts += 1; }
          }
        });

        const ordenada = Object.values(stats)
          .map(s => ({ ...s, gd: s.gf - s.gc }))
          .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        setTabla(ordenada);

        const scorersResponse = await fetch(`/api/public/tournaments/${encodeURIComponent(String(slug))}/scorers`, { cache: "no-store" });
        const scorersData = await scorersResponse.json();
        setGoleadores(scorersResponse.ok ? scorersData.scorers || [] : []);
      } catch (err) {
        console.error("Error cargando portal:", err);
        setErrorTorneo(true);
      }
    }
    inicializarPortal();

    // Cursor dinámico y animaciones INTACTAS
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
    
    const moveCursor = (e: MouseEvent) => {
      mouseX = e.clientX; mouseY = e.clientY;
      if(dot) { dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px'; }
    };
    document.addEventListener('mousemove', moveCursor);
    
    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      if(ring) { ring.style.left = ringX + 'px'; ring.style.top = ringY + 'px'; }
      requestAnimationFrame(animateRing);
    };
    animateRing();

    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));

    return () => { document.removeEventListener('mousemove', moveCursor); };
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Credenciales incorrectas. Acceso denegado.");
      setAuthLoading(false);
    } else {
      if (torneoActual) {
        localStorage.setItem('activeTournamentId', torneoActual.id);
      }
      router.push("/dashboard/partidos");
    }
  };

  const obtenerFechasUnicas = () => {
    const fechas = partidos.map(p => p.matchday);
    return Array.from(new Set(fechas)).sort((a, b) => a - b);
  };

  if (errorTorneo) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-sans">
        <div className="text-center">
          <h1 className="text-6xl text-[#D4A017] mb-4">404</h1>
          <h2 className="text-2xl font-bold uppercase tracking-widest">Torneo no encontrado</h2>
          <p className="text-gray-500 mt-2">El enlace proporcionado no es válido o el torneo ha sido eliminado.</p>
          <Link href="/" className="btn-primary mt-6"><i className="fa fa-home"></i> Volver al Inicio</Link>
        </div>
      </div>
    );
  }

  // Bandera para detectar si el torneo fue purgado/archivado por el sistema automatizado
  const isArchived = torneoActual?.status === 'archived';
  const partidoDestacado = partidos.find(partido => partido.status !== 'finished' && partido.match_date) || partidos[0];
  const finalizadosFinal = partidos.filter(partido => partido.status === "finished" && (partido.stage === "Final" || partido.stage === "Final (Vuelta)"));
  const finalBase = finalizadosFinal[0];
  const resultadoFinal = finalBase ? finalizadosFinal.reduce((result, match) => {
    result.home += Number(match.home_team_id === finalBase.home_team_id ? match.home_goals : match.away_goals) || 0;
    result.away += Number(match.home_team_id === finalBase.away_team_id ? match.home_goals : match.away_goals) || 0;
    if (match.resolved_by_penalties) {
      result.homePenalties = Number(match.home_team_id === finalBase.home_team_id ? match.home_penalties : match.away_penalties);
      result.awayPenalties = Number(match.home_team_id === finalBase.away_team_id ? match.home_penalties : match.away_penalties);
    }
    return result;
  }, { home: 0, away: 0, homePenalties: null as number | null, awayPenalties: null as number | null }) : null;
  const finalTieneGanador = resultadoFinal
    ? resultadoFinal.home !== resultadoFinal.away || (resultadoFinal.homePenalties !== null && resultadoFinal.homePenalties !== resultadoFinal.awayPenalties)
    : false;
  const campeonEsLocal = resultadoFinal
    ? resultadoFinal.home > resultadoFinal.away || (resultadoFinal.home === resultadoFinal.away && Number(resultadoFinal.homePenalties) > Number(resultadoFinal.awayPenalties))
    : false;
  const campeon = finalBase && finalTieneGanador ? (campeonEsLocal ? finalBase.home : finalBase.away) : null;
  const subcampeon = finalBase && finalTieneGanador ? (campeonEsLocal ? finalBase.away : finalBase.home) : null;

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{__html: `
        :root { --gold: #D4A017; --gold-light: #F5C842; --green: #1B6B2F; --green-light: #27A04A; --black: #0D0D0D; --dark: #141414; --dark2: #1C1C1C; --dark3: #242424; --white: #FFFFFF; --gray: #8A8A8A; --font-heading: system-ui, sans-serif; --font-display: impact, sans-serif; }
        body { background: var(--black); color: var(--white); overflow-x: hidden; font-family: var(--font-heading); cursor: none;}
        .cursor-dot, .cursor-ring { position: fixed; pointer-events: none; z-index: 99999; transform: translate(-50%, -50%); }
        .cursor-dot { width: 8px; height: 8px; background: var(--gold); border-radius: 50%; }
        .cursor-ring { width: 36px; height: 36px; border: 2px solid rgba(212,160,23,0.5); border-radius: 50%; transition: width 0.3s, height 0.3s; }
        .topbar { background: var(--green); padding: 8px 0; font-size: 13px; font-weight: bold;}
        .topbar-marquee { overflow: hidden; white-space: nowrap; }
        .topbar-marquee span { display: inline-block; padding-left: 100%; animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .hero { position: relative; min-height: 90vh; display: flex; align-items: center; padding: 4rem 2rem; overflow:hidden;}
        .hero-bg { position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(27,107,47,0.2) 0%, var(--black) 80%); z-index: -1; }
        .hero-title { font-family: var(--font-display); font-size: clamp(40px, 8vw, 90px); line-height: 0.9; text-transform: uppercase; margin-bottom: 20px;}
        .match-spotlight { position: relative; overflow: hidden; background: linear-gradient(145deg, rgba(28,28,28,.94), rgba(13,13,13,.98)); border: 1px solid rgba(212,160,23,.45); border-radius: 22px; padding: 24px; box-shadow: 0 20px 70px rgba(0,0,0,.55); }
        .match-spotlight::before { content: ''; position: absolute; inset: -70%; background: conic-gradient(transparent, rgba(212,160,23,.18), transparent 25%); animation: spotlight-spin 8s linear infinite; }
        .match-spotlight-content { position: relative; z-index: 1; }
        .team-shield { width: 76px; height: 76px; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,.65)); transition: transform .3s ease; }
        .match-spotlight:hover .team-shield { transform: scale(1.08); }
        @keyframes spotlight-spin { to { transform: rotate(360deg); } }
        .champion-stage { position: relative; overflow: hidden; background: radial-gradient(circle at center, rgba(212,160,23,.24), rgba(13,13,13,.97) 62%); border-top: 1px solid rgba(212,160,23,.35); border-bottom: 1px solid rgba(212,160,23,.35); }
        .champion-stage::before, .champion-stage::after { content: ''; position: absolute; width: 260px; height: 260px; border-radius: 50%; background: rgba(212,160,23,.12); filter: blur(35px); animation: champion-pulse 3s ease-in-out infinite alternate; }
        .champion-stage::before { left: -80px; top: -80px; }.champion-stage::after { right: -80px; bottom: -80px; animation-delay: 1s; }
        .champion-shield { animation: champion-float 2.8s ease-in-out infinite; filter: drop-shadow(0 0 28px rgba(245,200,66,.55)); }
        @keyframes champion-float { 50% { transform: translateY(-10px) scale(1.04); } }
        @keyframes champion-pulse { to { transform: scale(1.25); opacity: .45; } }
        .text-gold { color: var(--gold); }
        .btn-primary { background: linear-gradient(135deg, var(--gold) 0%, #A07810 100%); color: var(--black); padding: 12px 28px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; transition: 0.3s; border: none; cursor: none;}
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(212,160,23,0.4); }
        .btn-secondary { background: transparent; color: var(--gold); border: 1px solid var(--gold); padding: 12px 28px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; transition: 0.3s; cursor: none;}
        .btn-secondary:hover { background: rgba(212,160,23,0.1); }
        .section-label { color: var(--gold); font-weight: bold; letter-spacing: 3px; text-transform: uppercase; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center; gap:10px;}
        .section-label::before { content: ''; width: 30px; height: 2px; background: var(--gold); }
        
        .reveal { opacity: 0; transform: translateY(30px); transition: 0.8s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .sponsors-track { display: flex; gap: 40px; animation: marquee 20s linear infinite; padding: 40px 0;}
        .sponsor-logo { padding: 15px 30px; border: 1px solid var(--dark3); border-radius: 8px; color: var(--gray); font-weight: bold; white-space: nowrap; }
        
        /* ESTILOS PREMIUM TABS */
        .tabs-container { display: flex; background: var(--dark2); border-bottom: 1px solid var(--dark3); overflow-x: auto; white-space: nowrap; border-radius: 12px 12px 0 0;}
        .tabs-container::-webkit-scrollbar { height: 4px; }
        .tabs-container::-webkit-scrollbar-thumb { background: var(--gold); border-radius: 4px; }
        .tab-btn { flex: 1; padding: 15px 20px; background: transparent; color: var(--white); font-weight: bold; text-transform: uppercase; border: none; cursor: none; transition: 0.3s; border-bottom: 2px solid transparent;}
        .tab-btn.active { background: rgba(212,160,23,0.1); color: var(--gold); border-bottom: 2px solid var(--gold); }
        .tab-btn:hover { background: rgba(255,255,255,0.05); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(5px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;}
        .modal-content { background: var(--dark2); border: 1px solid rgba(212,160,23,0.5); border-radius: 12px; padding: 30px; width: 100%; max-width: 400px; box-shadow: 0 0 40px rgba(212,160,23,0.15); position: relative;}
        .modal-close { position: absolute; top: 15px; right: 20px; background: transparent; border: none; color: var(--gray); font-size: 20px; font-weight: bold; cursor: none; transition: 0.3s;}
        .modal-close:hover { color: var(--white); }
        .modal-input { width: 100%; background: var(--dark); border: 1px solid var(--dark3); color: var(--white); padding: 12px; border-radius: 8px; margin-top: 8px; margin-bottom: 20px; outline: none; transition: 0.3s;}
        .modal-input:focus { border-color: var(--gold); }

        /* UTILIDADES PREMIUM */
        .glass-card { background: rgba(28, 28, 28, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .stadium-glow { box-shadow: 0 0 20px rgba(212,160,23, 0.15); }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--dark); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--dark3); border-radius: 10px; }
      `}} />

      <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div>

      <div className="topbar">
        <div className="topbar-marquee">
          <span><i className="fa fa-trophy"></i> CHAMPIONS GAME-LEGAL 2026 — ¡DONDE NACEN LAS LEYENDAS! FORJA TU DESTINO EN LA CANCHA &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <i className="fa fa-futbol"></i> DEMUESTRA TU TALENTO — GLORIA, TRANSPARENCIA Y PASIÓN 🔥</span>
        </div>
      </div>

      <section className="hero">
        <div className="hero-bg" style={torneoActual?.banner_url ? { backgroundImage: `linear-gradient(rgba(13,13,13,.45), rgba(13,13,13,.92)), url("${torneoActual.banner_url}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}></div>
        <div style={{ zIndex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignItems: 'center', gap: '48px' }}>
          <div className="reveal">
            <div style={{ display: 'inline-block', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px' }}>
              <span style={{ display:'inline-block', width:'8px',height:'8px',background:'var(--green-light)',borderRadius:'50%',marginRight:'8px', animation: 'pulse 2s infinite'}}></span>
              {torneoActual?.name || 'EDICIÓN PRO 2026'}
            </div>
            <h1 className="hero-title">
              <span style={{ display: 'block' }}>La Pasión</span>
              <span className="text-gold" style={{ display: 'block' }}>Que Forja</span>
              <span style={{ display: 'block', color: 'transparent', WebkitTextStroke: '2px white' }}>Campeones</span>
            </h1>
            <p style={{ color: 'var(--gray)', fontSize: '18px', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.6' }}>
              El torneo de fútbol amateur más prestigioso. Vive cada partido, analiza tus estadísticas en tiempo real y escribe tu nombre en la historia deportiva.
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <Link href="/" className="btn-secondary">
                <i className="fa fa-arrow-left"></i> Volver al Directorio
              </Link>
              <button onClick={() => setShowLogin(true)} className="btn-primary">
                <i className="fa fa-shield-halved"></i> Acceso Administrador
              </button>
            </div>
          </div>
          {partidoDestacado && (
            <div className="match-spotlight reveal">
              <div className="match-spotlight-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  <span>Próximo partido</span><span>{partidoDestacado.stage}</span>
                </div>
                {torneoActual?.poster_url && <div style={{ height: '130px', margin: '18px 0', borderRadius: '14px', backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.7)),url("${torneoActual.poster_url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center', textAlign: 'center', marginTop: '22px' }}>
                  <div>{partidoDestacado.home?.shield_url ? <Image src={partidoDestacado.home.shield_url} alt="" width={76} height={76} unoptimized className="team-shield" /> : null}<p style={{ fontWeight: 900, textTransform: 'uppercase', marginTop: '8px' }}>{partidoDestacado.home?.name}</p></div>
                  <div style={{ color: 'var(--gold)', fontFamily: 'impact', fontSize: '28px' }}>{partidoDestacado.status === 'finished' ? `${partidoDestacado.home_goals} - ${partidoDestacado.away_goals}` : 'VS'}</div>
                  <div>{partidoDestacado.away?.shield_url ? <Image src={partidoDestacado.away.shield_url} alt="" width={76} height={76} unoptimized className="team-shield" /> : null}<p style={{ fontWeight: 900, textTransform: 'uppercase', marginTop: '8px' }}>{partidoDestacado.away?.name}</p></div>
                </div>
                <div style={{ marginTop: '22px', background: 'rgba(255,255,255,.04)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: 'var(--gray)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {partidoDestacado.match_date ? new Date(partidoDestacado.match_date).toLocaleString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Horario por confirmar'} · {partidoDestacado.court || 'Cancha por confirmar'}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {campeon && resultadoFinal && (
        <section className="champion-stage" style={{ padding: "70px 20px" }}>
          <div className="reveal" style={{ position: "relative", zIndex: 1, maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ color: "var(--gold)", fontSize: "12px", fontWeight: 900, letterSpacing: "4px", textTransform: "uppercase" }}>Campeón oficial</p>
            <div style={{ fontSize: "64px", margin: "14px 0", filter: "drop-shadow(0 0 20px rgba(212,160,23,.55))" }}>🏆</div>
            {campeon.shield_url && <Image src={campeon.shield_url} alt={`Escudo de ${campeon.name}`} width={150} height={150} unoptimized className="champion-shield mx-auto object-contain" />}
            <h2 style={{ color: "white", fontSize: "clamp(34px,7vw,72px)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "3px", marginTop: "18px" }}>{campeon.name}</h2>
            <p style={{ color: "var(--gold-light)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "2px", marginTop: "8px" }}>
              Final {resultadoFinal.home}-{resultadoFinal.away}{resultadoFinal.homePenalties !== null ? ` · Penales ${resultadoFinal.homePenalties}-${resultadoFinal.awayPenalties}` : ""}
            </p>
            <div style={{ marginTop: "28px", display: "inline-flex", alignItems: "center", gap: "12px", color: "var(--gray)", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", padding: "12px 20px", borderRadius: "999px" }}>
              {subcampeon?.shield_url && <Image src={subcampeon.shield_url} alt="" width={28} height={28} unoptimized className="object-contain" />}
              <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>Subcampeón · {subcampeon?.name}</span>
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: '80px 20px', background: 'var(--dark)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div className="reveal">
            <div className="section-label">{isArchived ? 'Torneo Finalizado' : 'Estadísticas en vivo'}</div>
            <h2 style={{ fontSize: '40px', textTransform: 'uppercase', marginBottom: '10px' }}>
              {isArchived ? 'Archivo' : 'Datos'} <span className="text-gold">{isArchived ? 'Histórico' : 'Oficiales'}</span>
            </h2>
            <p style={{ color: 'var(--gray)' }}>Transparencia absoluta. Conectado directamente a la base de datos oficial del torneo.</p>
          </div>

          <div className="bg-[#1C1C1C] border border-[#242424] rounded-xl overflow-hidden mt-8 reveal shadow-2xl stadium-glow" style={{ transitionDelay: '0.2s' }}>
            <div className="p-5 bg-[#242424] border-b border-[#1C1C1C] flex justify-between items-center flex-wrap gap-4">
              <h3 className="uppercase tracking-widest text-[#D4A017] font-bold">
                <i className="fa fa-trophy mr-2"></i> {torneoActual?.name || 'Copa GAME-LEGAL'}
              </h3>
              <div className="flex gap-3">
                <span className="text-xs border border-[#D4A017] text-[#D4A017] px-3 py-1 rounded-full font-bold">
                  <i className="fa fa-eye"></i> {visitas} Visitas
                </span>
                {isArchived ? (
                  <span className="text-xs bg-gray-600 text-white px-3 py-1 rounded-full font-bold">Clausurado</span>
                ) : (
                  <span className="text-xs bg-[#1B6B2F] text-white px-3 py-1 rounded-full font-bold">En curso</span>
                )}
              </div>
            </div>

            {isArchived ? (
              /* ====================================================================
                 PANTALLA HISTÓRICA DE CLAUSURA (CUANDO EL TORNEO ESTÁ ARCHIVADO)
                 ==================================================================== */
              <div className="p-10 flex flex-col items-center justify-center animate-in fade-in duration-700 min-h-[400px]">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce">
                  <i className="fa-solid fa-crown text-6xl text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]"></i>
                </div>
                <p className="text-[#D4A017] font-bold tracking-[0.3em] uppercase text-sm mb-4">Gran Campeón de la Temporada</p>
                <h2 className="text-5xl md:text-7xl font-black text-white text-center tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {torneoActual?.champion_name || "Club Campeón"}
                </h2>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4A017] to-transparent my-8"></div>
                <p className="text-gray-400 max-w-xl text-center text-sm">
                  Este torneo ha finalizado exitosamente y sus registros operativos han sido purgados para optimizar el ecosistema. La gloria pertenece ahora a la historia deportiva.
                </p>
                {torneoActual?.rules_url && (
                  <a href={torneoActual.rules_url} target="_blank" rel="noopener noreferrer" className="mt-8 text-xs font-bold text-gray-500 hover:text-white transition-colors border border-gray-700 px-4 py-2 rounded-full">
                    <i className="fa fa-file-pdf"></i> Ver Reglamento Histórico
                  </a>
                )}
              </div>
            ) : (
              /* ====================================================================
                 VISTAS PREMIUM (MIENTRAS EL TORNEO ESTÁ ACTIVO)
                 ==================================================================== */
              <>
                <div className="tabs-container">
                  <button onClick={() => setActiveTab('posiciones')} className={`tab-btn ${activeTab === 'posiciones' ? 'active' : ''}`}>Posiciones</button>
                  <button onClick={() => setActiveTab('equipos')} className={`tab-btn ${activeTab === 'equipos' ? 'active' : ''}`}>Equipos</button>
                  <button onClick={() => setActiveTab('partidos')} className={`tab-btn ${activeTab === 'partidos' ? 'active' : ''}`}>Partidos</button>
                  <button onClick={() => setActiveTab('goleadores')} className={`tab-btn ${activeTab === 'goleadores' ? 'active' : ''}`}>Goleadores</button>
                  <button onClick={() => setActiveTab('premios')} className={`tab-btn ${activeTab === 'premios' ? 'active' : ''}`}>Premios</button>
                  <button onClick={() => setActiveTab('reglamento')} className={`tab-btn ${activeTab === 'reglamento' ? 'active' : ''}`}>Reglamento</button>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                  
                  {/* PESTAÑA: POSICIONES (STADIUM GLOW) */}
                  {activeTab === 'posiciones' && (
                    <div className="animate-in fade-in duration-500">
                      <div className="overflow-x-auto custom-scrollbar relative z-10">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#141414] border-b border-[#242424] text-gray-400 text-[11px] font-mono tracking-wider uppercase">
                              <th className="py-5 px-6 text-center w-16">Pos</th>
                              <th className="py-5 px-6 min-w-[220px]">Equipo</th>
                              <th className="py-5 px-4 text-center">PJ</th>
                              <th className="py-5 px-4 text-center">G</th>
                              <th className="py-5 px-4 text-center">E</th>
                              <th className="py-5 px-4 text-center">P</th>
                              <th className="py-5 px-4 text-center text-green-400">GF</th>
                              <th className="py-5 px-4 text-center text-red-400">GC</th>
                              <th className="py-5 px-4 text-center">DG</th>
                              <th className="py-5 px-6 text-center text-[#D4A017] font-bold">PTS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-sm font-bold">
                            {tabla.length === 0 ? (
                              <tr><td colSpan={10} className="py-12 text-center text-gray-500 font-medium">Aún no existen registros en este grupo.</td></tr>
                            ) : (
                              tabla.map((equipo, index) => {
                                const numeroPosicion = String(index + 1).padStart(2, '0');
                                const calificaDirecto = index < 4; // Top 4 barra verde

                                return (
                                  <tr key={equipo.id} className={`hover:bg-white/5 transition-colors duration-150 relative group ${calificaDirecto ? 'border-l-4 border-l-[#1B6B2F]' : ''}`}>
                                    <td className={`py-4 px-6 text-center font-mono text-base ${index === 0 ? 'text-[#D4A017]' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                                      {numeroPosicion}
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#242424] flex items-center justify-center border border-white/5 overflow-hidden">
                                          {equipo.shield ? <Image src={equipo.shield} alt={equipo.name} width={32} height={32} unoptimized className="w-full h-full object-contain p-1" /> : <i className="fa-solid fa-shield-halved text-gray-600 text-xs"></i>}
                                        </div>
                                        <span className="text-white text-base font-black tracking-wide">{equipo.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-center text-gray-400 font-mono">{equipo.pj}</td>
                                    <td className="py-4 px-4 text-center text-gray-300 font-mono">{equipo.pg}</td>
                                    <td className="py-4 px-4 text-center text-gray-300 font-mono">{equipo.pe}</td>
                                    <td className="py-4 px-4 text-center text-gray-300 font-mono">{equipo.pp}</td>
                                    <td className="py-4 px-4 text-center text-green-400 font-mono">{equipo.gf}</td>
                                    <td className="py-4 px-4 text-center text-red-400 font-mono">{equipo.gc}</td>
                                    <td className={`py-4 px-4 text-center font-mono ${equipo.gd > 0 ? 'text-green-400' : equipo.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                      {equipo.gd > 0 ? `+${equipo.gd}` : equipo.gd}
                                    </td>
                                    <td className="py-4 px-6 text-center text-lg font-black text-[#D4A017] font-mono bg-black/20">
                                      {equipo.pts}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Momentum Deportivo Inferior */}
                      {tabla.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-t border-[#242424] bg-[#141414]">
                          <div className="bg-[#1C1C1C] border border-white/5 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#D4A017]/10 flex items-center justify-center text-[#D4A017] text-xl"><i className="fa-solid fa-fire"></i></div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Líder Goleador</p>
                              <p className="text-white font-black">{goleadores[0]?.name || "N/A"}</p>
                            </div>
                          </div>
                          <div className="bg-[#1C1C1C] border border-white/5 p-4 rounded-xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#1B6B2F]/10 flex items-center justify-center text-[#1B6B2F] text-xl"><i className="fa-solid fa-shield"></i></div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Puntero Actual</p>
                              <p className="text-white font-black">{tabla[0]?.name || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'equipos' && (
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
                      {equipos.map(equipo => (
                        <div key={equipo.id} className="glass-card rounded-2xl p-5 text-center hover:border-[#D4A017]/50 transition-all">
                          {equipo.shield_url ? <Image src={equipo.shield_url} alt={`Escudo de ${equipo.name}`} width={72} height={72} unoptimized className="w-20 h-20 mx-auto object-contain drop-shadow-xl" /> : <div className="w-20 h-20 mx-auto rounded-full bg-[#242424] flex items-center justify-center text-gray-600"><i className="fa fa-shield-halved text-2xl"></i></div>}
                          <p className="text-white font-black uppercase text-sm mt-4">{equipo.name}</p>
                          <p className="text-[#D4A017] text-[9px] font-bold uppercase tracking-widest mt-1">Grupo {equipo.group_name || "General"}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PESTAÑA: PARTIDOS */}
                  {activeTab === 'partidos' && (
                    <div className="p-6 animate-in fade-in duration-500">
                      {partidos.length === 0 ? (
                        <p className="text-center py-10 text-gray-500 font-medium">No hay encuentros programados en el sistema.</p>
                      ) : (
                        <div className="flex flex-col gap-8">
                          {obtenerFechasUnicas().map((fecha) => (
                            <div key={fecha} className="bg-[#141414] p-5 rounded-2xl border border-[#242424] shadow-lg">
                              <h4 className="text-[#D4A017] text-lg font-black uppercase mb-4 border-b border-[#242424] pb-2 tracking-widest">
                                <i className="fa fa-calendar-days mr-2"></i> Jornada / Fecha {fecha}
                              </h4>
                              <div className="flex flex-col gap-3">
                                {partidos.filter(p => p.matchday === fecha).map((match) => (
                                  <div key={match.id} className="flex items-center justify-between bg-[#1C1C1C] p-4 rounded-xl border border-white/5 hover:border-[#D4A017]/30 transition-all">
                                    <div className="flex-1 text-right">
                                      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 font-bold">{match.stage || 'Fase de Grupos'}</div>
                                      <span className="font-black text-white text-sm md:text-base">{match.home?.name}</span>
                                    </div>
                                    <div className="px-4 md:px-6">
                                      <div className="bg-[#0a0a0a] border border-[#242424] px-4 py-2 rounded-lg font-mono font-black text-lg md:text-2xl text-[#D4A017] shadow-inner text-center min-w-[80px]">
                                        {match.status === "finished" ? `${match.home_goals} - ${match.away_goals}` : "VS"}
                                      </div>
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 font-bold opacity-0 hidden md:block">.</div>
                                      <span className="font-black text-white text-sm md:text-base">{match.away?.name}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PESTAÑA: GOLEADORES */}
                  {activeTab === 'goleadores' && (
                    <div className="animate-in fade-in duration-500">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#141414] border-b border-[#242424] text-gray-400 text-[11px] font-mono tracking-wider uppercase">
                            <th className="py-5 px-6 text-center w-20">TOP</th>
                            <th className="py-5 px-6">Jugador Goleador</th>
                            <th className="py-5 px-6">Club Representante</th>
                            <th className="py-5 px-6 text-center text-[#D4A017] font-bold">Goles Anotados</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm font-bold">
                          {goleadores.length === 0 ? (
                            <tr><td colSpan={4} className="py-12 text-center text-gray-500 font-medium">Aún no hay artilleros registrados.</td></tr>
                          ) : (
                            goleadores.map((player, index) => (
                              <tr key={player.id} className="hover:bg-white/5 transition-colors duration-150">
                                <td className="py-4 px-6 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${index === 0 ? 'bg-[#D4A017] text-black' : index === 1 ? 'bg-gray-300 text-black' : index === 2 ? 'bg-amber-600 text-black' : 'text-gray-500'}`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-white font-black text-base">{player.name}</td>
                                <td className="py-4 px-6 text-gray-400">{player.team || "Libre"}</td>
                                <td className="py-4 px-6 text-center text-2xl font-black text-[#D4A017] font-mono">{player.goles || 0}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* PESTAÑA: PREMIOS */}
                  {activeTab === 'premios' && (
                    <div className="p-10 max-w-2xl mx-auto animate-in fade-in duration-500">
                      <h3 className="text-[#D4A017] text-center text-xl font-black uppercase tracking-[0.2em] mb-8">Bolsa de Premios</h3>
                      <div className="flex flex-col gap-4">
                        <div className="bg-[#141414] border border-[#242424] p-6 rounded-2xl border-l-4 border-l-yellow-400 flex items-center gap-6 shadow-lg hover:-translate-y-1 transition-transform">
                          <span className="text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">🥇</span>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Gran Campeón</p>
                            <p className="text-lg font-black text-white mt-1">{torneoActual?.prize_first || 'Por definir'}</p>
                          </div>
                        </div>
                        <div className="bg-[#141414] border border-[#242424] p-6 rounded-2xl border-l-4 border-l-gray-300 flex items-center gap-6 shadow-lg hover:-translate-y-1 transition-transform">
                          <span className="text-4xl">🥈</span>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Subcampeón</p>
                            <p className="text-lg font-black text-white mt-1">{torneoActual?.prize_second || 'Por definir'}</p>
                          </div>
                        </div>
                        <div className="bg-[#141414] border border-[#242424] p-6 rounded-2xl border-l-4 border-l-amber-600 flex items-center gap-6 shadow-lg hover:-translate-y-1 transition-transform">
                          <span className="text-4xl">🥉</span>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tercer Lugar</p>
                            <p className="text-lg font-black text-white mt-1">{torneoActual?.prize_third || 'Por definir'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PESTAÑA: REGLAMENTO */}
                  {activeTab === 'reglamento' && (
                    <div className="p-16 text-center animate-in fade-in duration-500">
                      <div className="text-6xl text-[#D4A017] mb-6"><i className="fa fa-gavel drop-shadow-[0_0_15px_rgba(212,160,23,0.3)]"></i></div>
                      <h3 className="text-white text-2xl font-black uppercase tracking-wide mb-4">Reglamento Oficial del Torneo</h3>
                      {torneoActual?.rules_url ? (
                        <>
                          <p className="text-gray-400 max-w-lg mx-auto mb-8">Descarga o visualiza el documento oficial en formato PDF para conocer las normas de competición y lineamientos disciplinarios.</p>
                          <a href={torneoActual.rules_url} target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform inline-flex items-center gap-3 cursor-none">
                            <i className="fa fa-file-pdf text-xl"></i> Ver Documento
                          </a>
                        </>
                      ) : (
                        <p className="text-gray-500">La mesa de organización aún no ha habilitado el reglamento digital para este torneo.</p>
                      )}
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: 'var(--dark2)', borderTop: '1px solid var(--dark3)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
          <div className="section-label" style={{ justifyContent: 'center' }}>Auspiciantes Oficiales</div>
          <div className="sponsors-track reveal">
            <div className="sponsor-logo">Banco Loja</div>
            <div className="sponsor-logo">Torneos Calib</div>
            <div className="sponsor-logo">Notaría Primera del Cantón Loja</div>
            <div className="sponsor-logo">Consultorio Jurídico Virtual GAME LEGAL ec</div>
            <div className="sponsor-logo">Dr. Alex Avila Aguirre</div>
            <div className="sponsor-logo">Banco Loja</div>
            <div className="sponsor-logo">Torneos Calib</div>
            <div className="sponsor-logo">Notaría Primera del Cantón Loja</div>
            <div className="sponsor-logo">Consultorio Jurídico Virtual GAME LEGAL ec</div>
            <div className="sponsor-logo">Dr. Alex Avila Aguirre</div>
          </div>
        </div>
      </section>

      <footer style={{ background: 'var(--black)', padding: '40px 20px', textAlign: 'center', color: 'var(--gray)', fontSize: '14px', borderTop: '1px solid var(--dark3)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--white)', letterSpacing: '3px', marginBottom: '10px' }}>GAME-LEGAL PRO</h2>
        <p style={{ marginBottom: '20px' }}>© 2026. Todos los derechos reservados.</p>
        <p style={{ color: 'var(--gold)' }}> 👑 Game Legal — La casa digital de los campeones.</p>
      </footer>

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content animate-in zoom-in duration-300">
            <button onClick={() => setShowLogin(false)} className="modal-close">✖</button>
            <h3 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '5px', color: 'var(--white)' }}>Acceso Pro</h3>
            <p style={{ color: 'var(--gold)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '25px' }}>Panel de Administración</p>
            
            <form onSubmit={handleLogin}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="modal-input"
                  placeholder="admin@gamelegal.com"
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contraseña</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="modal-input"
                  placeholder="••••••••"
                />
              </div>
              
              <button type="submit" disabled={authLoading} className="btn-primary" style={{ width: '100%', marginTop: '10px', textAlign: 'center' }}>
                {authLoading ? "Verificando..." : "Ingresar al Panel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
