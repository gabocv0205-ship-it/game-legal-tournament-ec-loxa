"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import Link from 'next/link';
import { PublicSpotlightCard } from "@/components/public-ui";
import { SponsorMarquee } from "@/components/SponsorMarquee";

const WHATSAPP_NUMBER = "593960553548";

export default function PortalPrincipal() {
  const router = useRouter();

  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [visitas, setVisitas] = useState(0);
  const [estadisticasPublicas, setEstadisticasPublicas] = useState({ activeTournaments: 0, registeredTeams: 0, playedMatches: 0, goals: 0 });
  const [torneoDestacado, setTorneoDestacado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sesionActiva, setSesionActiva] = useState(false);

  // Estados del Modal de Login
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const torneoDemo = useMemo(() => torneosActivos.find((torneo) =>
    String(torneo.name || "").toLocaleLowerCase().includes("champions loxa 2026")
  ) || null, [torneosActivos]);

  const registrarConversion = async (eventType: string, payload: Record<string, unknown> = {}) => {
    try {
      const storageKey = "gameLegalCommercialVisitor";
      let visitorKey = window.localStorage.getItem(storageKey);
      if (!visitorKey) {
        visitorKey = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(storageKey, visitorKey);
      }
      await supabase.from("commercial_events").insert({
        event_type: eventType,
        visitor_key: visitorKey,
        page_path: window.location.pathname,
        payload,
      });
    } catch {
      // La analitica nunca debe bloquear la navegacion ni el contacto comercial.
    }
  };

  useEffect(() => {
    let disposed = false;
    const refrescarEstadisticas = async () => {
      try {
        const response = await fetch("/api/public/overview", { cache: "no-store" });
        if (!response.ok) return;
        const summary = await response.json();
        if (!disposed) setEstadisticasPublicas({
          activeTournaments: Number(summary.activeTournaments || 0),
          registeredTeams: Number(summary.registeredTeams || 0),
          playedMatches: Number(summary.playedMatches || 0),
          goals: Number(summary.goals || 0),
        });
      } catch {
        // The landing page remains usable if public metrics are temporarily unavailable.
      }
    };
    async function inicializarPortal() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSesionActiva(Boolean(session));
        void registrarConversion("landing_view");
        void refrescarEstadisticas();
        await supabase.from("status_visits").insert([{}]);
        const { count } = await supabase.from("status_visits").select("*", { count: "exact", head: true });
        if (count) setVisitas(count);

        const { data: tourneys } = await supabase
          .from("tournaments")
          .select("id,name,slug,status,created_at")
          .order("created_at", { ascending: false });
        
        if (tourneys && tourneys.length > 0) {
          const visibles = tourneys.filter((torneo: any) => !["finished", "archived", "deleted"].includes(String(torneo.status || "active")));
          setTorneosActivos(visibles);
          setTorneoDestacado(visibles[0] || null);
        }
      } catch (err) {
        console.error("Error cargando portal principal:", err);
      } finally {
        setLoading(false);
      }
    }
    inicializarPortal();

    // Realtime is used when Supabase replication is enabled; the interval is a
    // low-cost fallback for projects where public realtime is disabled.
    const overviewChannel = supabase.channel("public-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, refrescarEstadisticas)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, refrescarEstadisticas)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refrescarEstadisticas)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, refrescarEstadisticas)
      .subscribe();
    const statsTimer = window.setInterval(refrescarEstadisticas, 45_000);

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesionActiva(Boolean(session));
    });

    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
    let rafId = 0;
    let cursorAnimationActive = false;
    const canUseCustomCursor = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
    
    const moveCursor = (e: MouseEvent) => {
      mouseX = e.clientX; mouseY = e.clientY;
      if(dot) { dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px'; }
      if (!cursorAnimationActive) {
        cursorAnimationActive = true;
        rafId = requestAnimationFrame(animateRing);
      }
    };
    
    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      if(ring) { ring.style.left = ringX + 'px'; ring.style.top = ringY + 'px'; }
      const distance = Math.abs(mouseX - ringX) + Math.abs(mouseY - ringY);
      if (distance > 0.5) {
        rafId = requestAnimationFrame(animateRing);
      } else {
        cursorAnimationActive = false;
      }
    };
    if (canUseCustomCursor) {
      document.addEventListener('mousemove', moveCursor);
    }

    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));

    return () => {
      disposed = true;
      window.clearInterval(statsTimer);
      void supabase.removeChannel(overviewChannel);
      if (canUseCustomCursor) document.removeEventListener('mousemove', moveCursor);
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Credenciales incorrectas. Acceso denegado.");
      setAuthLoading(false);
    } else {
      router.push("/dashboard/torneos");
    }
  };

  // NUEVO: Función para Recuperar Contraseña
  const handleRecuperarPassword = async () => {
    if (!email) {
      alert("Por favor, ingresa tu correo electrónico en el campo superior primero.");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    if (error) {
      alert("Error al intentar enviar el correo: " + error.message);
    } else {
      alert("Te hemos enviado un enlace de recuperación. Revisa tu bandeja de entrada o la carpeta de SPAM.");
    }
    setAuthLoading(false);
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{__html: `
        :root { --gold: #D4A017; --gold-light: #F5C842; --green: #1B6B2F; --green-light: #27A04A; --black: #0D0D0D; --dark: #141414; --dark2: #1C1C1C; --dark3: #242424; --white: #FFFFFF; --gray: #8A8A8A; --font-heading: system-ui, sans-serif; --font-display: impact, sans-serif; }
        body { background: var(--black); color: var(--white); overflow-x: hidden; font-family: var(--font-heading); cursor: auto;}
        @media (pointer: fine) and (prefers-reduced-motion: no-preference) {
          body, .btn-primary, .modal-close { cursor: none; }
        }
        .cursor-dot, .cursor-ring { position: fixed; pointer-events: none; z-index: 99999; transform: translate(-50%, -50%); }
        .cursor-dot { width: 8px; height: 8px; background: var(--gold); border-radius: 50%; }
        .cursor-ring { width: 36px; height: 36px; border: 2px solid rgba(212,160,23,0.5); border-radius: 50%; transition: width 0.3s, height 0.3s; }
        .topbar { background: var(--green); padding: 8px 0; font-size: 13px; font-weight: bold;}
        .topbar-marquee { overflow: hidden; white-space: nowrap; }
        .topbar-marquee span { display: inline-block; padding-left: 100%; animation: marquee 30s linear infinite !important; animation-play-state: running !important; will-change: transform; }
        @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .hero { position: relative; min-height: calc(100vh - 34px); display: flex; align-items: center; padding: clamp(56px, 8vw, 96px) clamp(18px, 5vw, 48px); overflow:hidden;}
        .hero-bg { position: absolute; inset: 0; background: radial-gradient(circle at 75% 28%, rgba(212,160,23,0.16), transparent 28%), radial-gradient(circle at center, rgba(27,107,47,0.22) 0%, var(--black) 78%); z-index: -1; }
        .hero-shell { z-index: 1; max-width: 1200px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, .7fr); gap: clamp(28px, 5vw, 72px); align-items: center; }
        .hero-copy { min-width: 0; }
        .hero-title { font-family: var(--font-display); font-size: clamp(42px, 9vw, 98px); line-height: 0.88; text-transform: uppercase; margin-bottom: 20px; overflow-wrap: anywhere;}
        .hero-summary { color: var(--gray); font-size: clamp(15px, 2vw, 18px); max-width: 600px; margin-bottom: 34px; line-height: 1.7; }
        .hero-actions { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
        .hero-panel { border: 1px solid rgba(212,160,23,.32); background: linear-gradient(145deg, rgba(28,28,28,.86), rgba(7,7,7,.92)); border-radius: 28px; padding: clamp(20px, 4vw, 34px); box-shadow: 0 28px 80px rgba(0,0,0,.45); min-width: 0; }
        .hero-panel-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 22px; }
        .hero-mini-card { min-height: 92px; border: 1px solid var(--dark3); border-radius: 18px; background: rgba(13,13,13,.72); padding: 16px; }
        .hero-mini-card strong { display:block; font-size: clamp(22px, 4vw, 32px); color: var(--gold); line-height:1; }
        .hero-mini-card span { display:block; color: var(--gray); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 8px; }
        .text-gold { color: var(--gold); }
        .btn-primary { background: linear-gradient(135deg, var(--gold) 0%, #A07810 100%); color: var(--black); padding: 12px 28px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; transition: 0.3s; border: none; cursor: none;}
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(212,160,23,0.4); }
        .section-label { color: var(--gold); font-weight: bold; letter-spacing: 3px; text-transform: uppercase; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center; gap:10px;}
        .section-label::before { content: ''; width: 30px; height: 2px; background: var(--gold); }
        .reveal { opacity: 0; transform: translateY(30px); transition: 0.8s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .sponsors-track { display: flex; width: max-content; gap: 40px; animation: marquee 20s linear infinite !important; animation-play-state: running !important; padding: 40px 0; will-change: transform;}
        .sponsor-logo { padding: 15px 30px; border: 1px solid var(--dark3); border-radius: 8px; color: var(--gray); font-weight: bold; white-space: nowrap; }
        .value-section { padding: clamp(58px, 8vw, 96px) 20px; background: linear-gradient(180deg, var(--black), var(--dark)); border-top: 1px solid var(--dark3); }
        .value-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 34px; }
        .value-card { min-height: 190px; border: 1px solid rgba(212,160,23,.22); border-radius: 22px; padding: 26px; background: linear-gradient(145deg, rgba(28,28,28,.92), rgba(14,14,14,.96)); box-shadow: 0 18px 45px rgba(0,0,0,.2); }
        .value-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px; background: rgba(212,160,23,.14); color: var(--gold-light); font-size: 18px; margin-bottom: 18px; }
        .value-card h3 { color: var(--white); font-size: 18px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; }
        .value-card p { color: var(--gray); font-size: 14px; line-height: 1.7; margin: 0; }
        .steps-section { padding: clamp(56px, 7vw, 82px) 20px; background: var(--dark2); border-top: 1px solid var(--dark3); }
        .steps-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 30px; }
        .step-card { display: flex; gap: 15px; align-items: flex-start; padding: 22px; border-radius: 18px; background: rgba(13,13,13,.72); border: 1px solid var(--dark3); }
        .step-number { flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: var(--gold); color: var(--black); font-weight: 900; }
        .step-card strong { display: block; color: var(--white); text-transform: uppercase; font-size: 13px; letter-spacing: 1px; margin-bottom: 6px; }
        .step-card span { color: var(--gray); font-size: 12px; line-height: 1.6; }
        .sales-cta { margin: 0 auto; max-width: 1200px; padding: clamp(28px, 5vw, 48px); border: 1px solid rgba(212,160,23,.5); border-radius: 26px; background: radial-gradient(circle at 90% 20%, rgba(212,160,23,.2), transparent 35%), linear-gradient(135deg, #162718, #111); display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .sales-cta h2 { margin: 0 0 8px; color: var(--white); font-size: clamp(22px, 4vw, 36px); line-height: 1.1; text-transform: uppercase; }
        .sales-cta p { margin: 0; color: #b4c2b6; line-height: 1.6; max-width: 650px; }
        .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid rgba(212,160,23,.65); color: var(--gold-light); padding: 12px 20px; border-radius: 6px; font-size: 12px; font-weight: 900; text-transform: uppercase; white-space: nowrap; transition: .25s; }
        .btn-secondary:hover { background: var(--gold); color: var(--black); transform: translateY(-2px); }
        .demo-section { padding: clamp(56px, 7vw, 90px) 20px; background: radial-gradient(circle at 18% 0%, rgba(27,107,47,.18), transparent 34%), var(--black); border-top: 1px solid var(--dark3); }
        .demo-grid { display:grid; grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr); gap: 24px; align-items: stretch; }
        .demo-card, .plan-card, .showcase-card { border:1px solid var(--dark3); background:linear-gradient(145deg, rgba(28,28,28,.96), rgba(9,9,9,.96)); border-radius:22px; overflow:hidden; }
        .demo-card { padding: clamp(24px, 4vw, 38px); display:flex; flex-direction:column; justify-content:center; min-height:330px; }
        .demo-card h2 { margin:0 0 14px; color:var(--white); font-size:clamp(28px, 4vw, 46px); line-height:1; text-transform:uppercase; }
        .demo-card p { color:var(--gray); line-height:1.7; margin:0 0 24px; max-width:560px; }
        .demo-proof { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
        .demo-proof span { border:1px solid rgba(212,160,23,.25); padding:11px; color:#d9d9d9; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; border-radius:10px; }
        .showcase-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:16px; margin-top:30px; }
        .showcase-card { aspect-ratio: .78; position:relative; box-shadow:0 16px 38px rgba(0,0,0,.22); }
        .showcase-card img { width:100%; height:100%; object-fit:cover; transition:transform .35s ease; }
        .showcase-card:hover img { transform:scale(1.04); }
        .showcase-caption { position:absolute; inset:auto 0 0; padding:35px 14px 14px; color:var(--white); font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:1.1px; background:linear-gradient(transparent, rgba(0,0,0,.93)); }
        .plans-section { padding:clamp(56px, 7vw, 90px) 20px; background:var(--dark2); border-top:1px solid var(--dark3); }
        .plans-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:18px; margin-top:30px; }
        .plan-card { padding:26px; display:flex; flex-direction:column; min-height:370px; }
        .plan-card.featured { border-color:var(--gold); box-shadow:0 18px 48px rgba(212,160,23,.13); transform:translateY(-8px); }
        .plan-kicker { color:var(--gold); font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:2px; }
        .plan-card h3 { color:var(--white); margin:10px 0 8px; font-size:28px; text-transform:uppercase; }
        .plan-card p { color:var(--gray); font-size:14px; line-height:1.6; min-height:68px; }
        .plan-list { list-style:none; padding:0; margin:18px 0 26px; color:#d2d2d2; font-size:13px; line-height:1.8; flex:1; }
        .plan-list li::before { content:'✓'; color:var(--gold); margin-right:8px; font-weight:900; }
        @media (max-width: 760px) { .value-grid, .steps-grid { grid-template-columns: 1fr; } .sales-cta { align-items: flex-start; flex-direction: column; } .btn-secondary { width: 100%; } }

        .section-wrap { padding: clamp(56px, 7vw, 88px) 20px; }
        .section-inner { max-width: 1200px; margin: 0 auto; }
        .tournament-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px; align-items: stretch; }
        .tournament-card { min-height: 210px; background: linear-gradient(145deg, var(--dark2), #111); border: 1px solid var(--dark3); border-radius: 22px; overflow: hidden; padding: 24px; transition: 0.3s; cursor: none; text-decoration: none; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 18px 45px rgba(0,0,0,.22);}
        .tournament-card:hover { border-color: var(--gold); transform: translateY(-5px); box-shadow: 0 10px 30px rgba(212,160,23,0.1); }
        .tournament-title { text-transform: uppercase; letter-spacing: 1.6px; color: var(--gold); font-size: clamp(15px, 2vw, 18px); margin: 0; line-height: 1.25; overflow-wrap: anywhere; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(5px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;}
        .modal-content { background: var(--dark2); border: 1px solid rgba(212,160,23,0.5); border-radius: 12px; padding: 30px; width: 100%; max-width: 400px; box-shadow: 0 0 40px rgba(212,160,23,0.15); position: relative;}
        .modal-close { position: absolute; top: 15px; right: 20px; background: transparent; border: none; color: var(--gray); font-size: 20px; font-weight: bold; cursor: none; transition: 0.3s;}
        .modal-close:hover { color: var(--white); }
        .modal-input { width: 100%; background: var(--dark); border: 1px solid var(--dark3); color: var(--white); padding: 12px; border-radius: 8px; margin-top: 8px; margin-bottom: 8px; outline: none; transition: 0.3s;}
        .modal-input:focus { border-color: var(--gold); }
        @media (max-width: 900px) {
          body { cursor: auto; }
          .cursor-dot, .cursor-ring { display:none; }
          .hero-shell { grid-template-columns: 1fr; }
          .hero { align-items:flex-start; min-height:auto; }
          .hero-panel { order: -1; }
        }
        @media (max-width: 560px) {
          .topbar { font-size: 11px; }
          .hero { padding: 34px 16px 48px; }
          .hero-panel-grid { grid-template-columns: 1fr; }
          .btn-primary { width: 100%; text-align: center; }
          .section-label { font-size: 12px; letter-spacing: 2px; }
          .sponsors-track { gap: 16px; }
        .sponsor-logo { padding: 12px 18px; font-size: 12px; }
        }
        @media (max-width: 900px) { .demo-grid, .plans-grid { grid-template-columns:1fr; } .showcase-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } .plan-card.featured { transform:none; } }
      `}} />

      <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div>

      <div className="topbar">
        <div className="topbar-marquee">
          <span><i className="fa fa-trophy"></i> GAME-LEGAL — ¡DONDE NACEN LAS LEYENDAS! FORJA TU DESTINO EN LA CANCHA &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <i className="fa fa-futbol"></i> DEMUESTRA TU TALENTO — GLORIA, TRANSPARENCIA Y PASIÓN 🔥</span>
        </div>
      </div>

      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-shell">
          <div className="hero-copy reveal">
            <div style={{ display: 'inline-block', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px' }}>
              <span style={{ display:'inline-block', width:'8px',height:'8px',background:'var(--green-light)',borderRadius:'50%',marginRight:'8px', animation: 'pulse 2s infinite'}}></span>
              {torneoDestacado?.name || 'EDICIÓN PRO 2026'}
            </div>
            <h1 className="hero-title">
              <span style={{ display: 'block' }}>La Pasión</span>
              <span className="text-gold" style={{ display: 'block' }}>Que Forja</span>
              <span style={{ display: 'block', color: 'transparent', WebkitTextStroke: '2px white' }}>Campeones</span>
            </h1>
            <p className="hero-summary">
              El torneo de fútbol amateur más prestigioso. Vive cada partido, analiza tus estadísticas en tiempo real y escribe tu nombre en la historia deportiva.
            </p>
            <div className="hero-actions">
              {sesionActiva ? (
                <button onClick={() => router.push("/dashboard/torneos")} className="btn-primary">
                  <i className="fa fa-arrow-right"></i> Volver al Panel
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="btn-primary">
                  <i className="fa fa-shield-halved"></i> Quiero organizar mi torneo
                </button>
              )}
              {torneoDemo && (
                <Link href={`/torneo/${torneoDemo.slug}`} onClick={() => void registrarConversion("demo_open", { tournament_id: torneoDemo.id, tournament_name: torneoDemo.name, source: "hero" })} className="btn-secondary">
                  <i className="fa fa-eye"></i> Ver demo publica
                </Link>
              )}
              <a href="#como-funciona" className="btn-secondary"><i className="fa fa-play"></i> Como funciona</a>
            </div>
          </div>
          <PublicSpotlightCard className="hero-panel reveal premium-motion-card" style={{ transitionDelay: '0.12s' }}>
            <div className="section-label">Centro publico</div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', lineHeight: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Gestion deportiva en vivo</h2>
            <p style={{ color: 'var(--gray)', lineHeight: 1.7, fontSize: 14 }}>Consulta torneos, posiciones, goleadores, partidos y comunicados desde una experiencia limpia y preparada para cualquier pantalla.</p>
            <div className="hero-panel-grid">
              <div className="hero-mini-card"><strong>{estadisticasPublicas.activeTournaments}</strong><span>Torneos activos</span></div>
              <div className="hero-mini-card"><strong>{estadisticasPublicas.registeredTeams}</strong><span>Equipos registrados</span></div>
              <div className="hero-mini-card"><strong>{estadisticasPublicas.playedMatches}</strong><span>Partidos jugados</span></div>
              <div className="hero-mini-card"><strong>{estadisticasPublicas.goals}</strong><span>Goles anotados</span></div>
              <div className="hero-mini-card"><strong>{visitas || 0}</strong><span>Visitas publicas</span></div>
            </div>
          </PublicSpotlightCard>
        </div>
      </section>

      <section className="value-section" aria-labelledby="beneficios-title">
        <div className="section-inner">
          <div className="reveal">
            <div className="section-label">Una plataforma, todo el campeonato</div>
            <h2 id="beneficios-title" style={{ fontSize: 'clamp(30px, 5vw, 48px)', textTransform: 'uppercase', marginBottom: '10px' }}>Menos trabajo. <span className="text-gold">Mas control.</span></h2>
            <p style={{ color: 'var(--gray)', maxWidth: '720px', lineHeight: 1.7 }}>Game-Legal reemplaza hojas dispersas, calculos manuales y grupos de mensajeria por una experiencia centralizada para organizadores, dirigentes y aficionados.</p>
          </div>
          <div className="value-grid">
            <article className="value-card reveal"><div className="value-icon"><i className="fa fa-calendar-check"></i></div><h3>Organiza sin improvisar</h3><p>Configura el formato, grupos, canchas, horarios, sanciones y reglas antes de generar el calendario.</p></article>
            <article className="value-card reveal" style={{ transitionDelay: '0.08s' }}><div className="value-icon"><i className="fa fa-chart-line"></i></div><h3>Decide con datos</h3><p>Consulta posiciones, goleadores, resultados, alertas disciplinarias y estados financieros desde un mismo lugar.</p></article>
            <article className="value-card reveal" style={{ transitionDelay: '0.16s' }}><div className="value-icon"><i className="fa fa-share-nodes"></i></div><h3>Hazlo visible</h3><p>Comparte posters, grupos, partidos y la pagina publica del torneo con una imagen profesional.</p></article>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="steps-section" aria-labelledby="steps-title">
        <div className="section-inner">
          <div className="reveal"><div className="section-label">Empieza en minutos</div><h2 id="steps-title" style={{ fontSize: 'clamp(28px, 5vw, 44px)', textTransform: 'uppercase' }}>Tu torneo, <span className="text-gold">paso a paso</span></h2></div>
          <div className="steps-grid">
            <div className="step-card reveal"><span className="step-number">1</span><div><strong>Configura</strong><span>Define identidad, modalidad, reglas, grupos y calendario.</span></div></div>
            <div className="step-card reveal" style={{ transitionDelay: '0.08s' }}><span className="step-number">2</span><div><strong>Gestiona</strong><span>Registra equipos, jugadores, pagos, eventos y sanciones.</span></div></div>
            <div className="step-card reveal" style={{ transitionDelay: '0.16s' }}><span className="step-number">3</span><div><strong>Publica</strong><span>Entrega a tu comunidad una experiencia en vivo y lista para compartir.</span></div></div>
          </div>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="demo-title">
        <div className="section-inner">
          <div className="demo-grid reveal">
            <article className="demo-card">
              <div className="section-label">Explora antes de contratar</div>
              <h2 id="demo-title">Demo publica<br /><span className="text-gold">Champions Loxa 2026</span></h2>
              <p>Un torneo ficticio completamente configurado para que conozcas la experiencia real: grupos, calendario, posiciones, goleadores y la comunicacion visual para tus redes.</p>
              {torneoDemo ? (
                <Link href={`/torneo/${torneoDemo.slug}`} onClick={() => void registrarConversion("demo_open", { tournament_id: torneoDemo.id, tournament_name: torneoDemo.name, source: "demo_section" })} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                  <i className="fa fa-arrow-up-right-from-square"></i> Explorar la demo
                </Link>
              ) : (
                <a href="#torneos" className="btn-primary" style={{ alignSelf: 'flex-start' }}><i className="fa fa-trophy"></i> Ver torneos disponibles</a>
              )}
            </article>
            <aside className="demo-card" style={{ background: 'linear-gradient(150deg, rgba(27,107,47,.55), rgba(10,10,10,.98))' }}>
              <div className="section-label">Incluye</div>
              <h3 style={{ color: 'var(--white)', fontSize: 25, textTransform: 'uppercase', margin: '0 0 22px' }}>Una experiencia completa</h3>
              <div className="demo-proof"><span>Grupos y fixture</span><span>Tabla en vivo</span><span>Goleadores</span><span>Posters listos</span><span>Escudos reales</span><span>Vista movil</span></div>
            </aside>
          </div>

          <div className="reveal" style={{ marginTop: 56 }}>
            <div className="section-label">Resultados que puedes compartir</div>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', textTransform: 'uppercase', margin: 0 }}>Material real de <span className="text-gold">Champions Loxa 2026</span></h2>
            <p style={{ color: 'var(--gray)', lineHeight: 1.7 }}>Ejemplos generados por la plataforma con datos ficticios: posters, sorteo, tabla y goleadores.</p>
          </div>
          <div className="showcase-grid reveal" style={{ transitionDelay: '0.08s' }}>
            {[
              ["/showcase/champions-loxa-partidos.webp", "Poster de jornada"],
              ["/showcase/champions-loxa-sorteo.jpg", "Sorteo y grupos"],
              ["/showcase/champions-loxa-posiciones.webp", "Tabla de posiciones"],
              ["/showcase/champions-loxa-goleadores.webp", "Goleadores"],
            ].map(([src, label]) => (
              <article className="showcase-card" key={src}>
                <Image src={src} alt={label} width={540} height={720} sizes="(max-width: 900px) 50vw, 25vw" />
                <div className="showcase-caption">{label}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="plans-section" aria-labelledby="planes-title">
        <div className="section-inner">
          <div className="reveal"><div className="section-label">Planes para cada organizador</div><h2 id="planes-title" style={{ fontSize: 'clamp(28px, 5vw, 44px)', textTransform: 'uppercase', margin: 0 }}>Elige el nivel que necesita <span className="text-gold">tu competencia</span></h2><p style={{ color: 'var(--gray)', lineHeight: 1.7 }}>Son propuestas comerciales flexibles. Define el valor final según número de equipos, duración y acompañamiento requerido.</p></div>
          <div className="plans-grid">
            {[
              ["Basico", "Para ligas que empiezan a digitalizar su campeonato.", ["1 torneo activo", "Equipos, jugadores y fixture", "Resultados y tabla publica", "Soporte de puesta en marcha"]],
              ["Profesional", "La opcion recomendada para un torneo con presencia y control total.", ["Todo lo del plan Basico", "Finanzas y estados de pago", "Posters, planillas y carnets", "Pagina publica personalizada", "Soporte prioritario"]],
              ["Premium", "Para organizaciones con varios torneos y una operacion consolidada.", ["Todo lo del plan Profesional", "Multiples torneos y colaboradores", "Reportes y control comercial", "Identidad visual avanzada", "Acompanamiento preferencial"]],
            ].map(([name, description, benefits], index) => (
              <article className={`plan-card reveal ${index === 1 ? 'featured' : ''}`} key={String(name)} style={{ transitionDelay: `${index * 0.08}s` }}>
                <div className="plan-kicker">{index === 1 ? 'Mas elegido' : 'Game Legal'}</div><h3>{name}</h3><p>{description}</p>
                <ul className="plan-list">{(benefits as string[]).map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
                <a className={index === 1 ? 'btn-primary' : 'btn-secondary'} href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, deseo conocer el plan ${name} de Game Legal.`)}`} target="_blank" rel="noopener noreferrer" onClick={() => void registrarConversion("whatsapp_lead_click", { source: "commercial_plan", plan: name })}>Solicitar propuesta</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wrap" style={{ background: 'var(--dark)' }}>
        <div className="section-inner">
          <div className="reveal">
            <div className="section-label">Directorio Oficial</div>
            <h2 style={{ fontSize: '40px', textTransform: 'uppercase', marginBottom: '10px' }}>Ligas <span className="text-gold">Activas</span></h2>
            <p style={{ color: 'var(--gray)' }}>Transparencia absoluta. Selecciona tu torneo para acceder a la base de datos oficial.</p>
          </div>

          <div id="torneos" className="reveal" style={{ transitionDelay: '0.2s', marginTop: '40px' }}>
            {loading ? (
               <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gold)' }}>Cargando torneos...</div>
            ) : (
               <div className="tournament-grid">
                 {torneosActivos.length === 0 ? (
                   <p style={{ color: 'var(--gray)', padding: '20px' }}>Aún no hay torneos registrados en el sistema.</p>
                 ) : (
                   torneosActivos.map((torneo, index) => (
                     <Link href={`/torneo/${torneo.slug}`} key={torneo.id} onClick={() => void registrarConversion("public_tournament_open", { tournament_id: torneo.id, tournament_name: torneo.name, source: "directory" })} style={{ textDecoration: 'none' }}>
                       <PublicSpotlightCard className="tournament-card premium-motion-card" style={{ transitionDelay: `${Math.min(index * 35, 180)}ms` }}>
                         <div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                             <h3 className="tournament-title"><i className="fa fa-trophy"></i> {torneo.name}</h3>
                             <span style={{ fontSize: '10px', background: 'var(--green)', color: 'white', padding: '3px 8px', borderRadius: '15px', fontWeight: 'bold', textTransform: 'uppercase' }}>En Curso</span>
                           </div>
                           <p style={{ color: 'var(--gray)', fontSize: '12px', marginTop: '10px' }}>Gestión Integral GAME-LEGAL</p>
                         </div>
                         <div style={{ marginTop: '20px', borderTop: '1px solid var(--dark3)', paddingTop: '15px', color: 'var(--gold)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                           Ver Estadísticas Completas <i className="fa fa-arrow-right"></i>
                         </div>
                       </PublicSpotlightCard>
                     </Link>
                   ))
                 )}
               </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-wrap" style={{ background: 'var(--black)' }}>
        <div className="sales-cta reveal">
          <div><h2>Convierte tu torneo en una experiencia profesional</h2><p>Te ayudamos a poner en marcha tu primer campeonato, cargar la identidad visual y dejar lista la pagina publica para tus equipos y auspiciantes.</p></div>
          <a className="btn-primary" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, deseo una demostracion de Game Legal.")}`} target="_blank" rel="noopener noreferrer" onClick={() => void registrarConversion("whatsapp_lead_click", { source: "landing_cta" })}><i className="fa fa-whatsapp"></i> Solicitar demostracion</a>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: 'var(--dark2)', borderTop: '1px solid var(--dark3)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
          <div className="section-label" style={{ justifyContent: 'center' }}>Auspiciantes Oficiales</div>
          <SponsorMarquee className="reveal" sponsors={[
              "⚖️ Dra. Gina Calva - Notaría Primera Del Cantón Loja",
  "👨‍⚖️ Dr. Alex Ávila",
  "📚 Game-Legal Estudio Jurídico Virtual",
  "☕ Cafetería Coffee Time",
  "🖨️ Mister Copy",
  "🍿 Botanitas Express",
  "🌴 Torneos Calib",
  "💳 Multipagos San Sebastián",
  "⚖️ Dra. Gina Calva - Notaría Primera Del Cantón Loja",
  "👨‍⚖️ Dr. Alex Ávila",
  "📚 Game-Legal Estudio Jurídico Virtual",
  "☕ Cafetería Coffee Time",
  "🖨️ Mister Copy",
  "🍿 Botanitas Express",
  "🌴 Torneos Calib",
  "💳 Multipagos San Sebastián"
            ]} />
        </div>
      </section>

      <footer style={{ background: 'var(--black)', padding: '40px 20px', textAlign: 'center', color: 'var(--gray)', fontSize: '14px', borderTop: '1px solid var(--dark3)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--white)', letterSpacing: '3px', marginBottom: '10px' }}>GAME-LEGAL PRO</h2>
        <p style={{ marginBottom: '20px' }}>© 2026. Todos los derechos reservados.</p>
        <p style={{ color: 'var(--gold)' }}> 👑 Game Legal — La casa digital de los campeones.</p>
      </footer>

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowLogin(false)} className="modal-close">✖</button>
            <h3 style={{ fontSize: '24px', fontWeight: 'black', textTransform: 'uppercase', marginBottom: '5px', color: 'var(--white)' }}>Acceso Pro</h3>
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
                  className="modal-input"
                  placeholder="••••••••"
                />
              </div>
              
              <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                <button type="button" onClick={handleRecuperarPassword} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              
              <button type="submit" disabled={authLoading} className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                {authLoading ? "Verificando..." : "Ingresar al Panel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
