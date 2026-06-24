"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import Link from 'next/link';

export default function PortalPrincipal() {
  const router = useRouter();

  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [visitas, setVisitas] = useState(0);
  const [torneoDestacado, setTorneoDestacado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sesionActiva, setSesionActiva] = useState(false);

  // Estados del Modal de Login
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesionActiva(Boolean(session));
    });

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

    return () => {
      document.removeEventListener('mousemove', moveCursor);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Credenciales incorrectas. Acceso denegado.");
      setAuthLoading(false);
    } else {
      router.push("/dashboard/partidos");
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
        body { background: var(--black); color: var(--white); overflow-x: hidden; font-family: var(--font-heading); cursor: none;}
        .cursor-dot, .cursor-ring { position: fixed; pointer-events: none; z-index: 99999; transform: translate(-50%, -50%); }
        .cursor-dot { width: 8px; height: 8px; background: var(--gold); border-radius: 50%; }
        .cursor-ring { width: 36px; height: 36px; border: 2px solid rgba(212,160,23,0.5); border-radius: 50%; transition: width 0.3s, height 0.3s; }
        .topbar { background: var(--green); padding: 8px 0; font-size: 13px; font-weight: bold;}
        .topbar-marquee { overflow: hidden; white-space: nowrap; }
        .topbar-marquee span { display: inline-block; padding-left: 100%; animation: marquee 30s linear infinite; }
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
        .sponsors-track { display: flex; gap: 40px; animation: marquee 20s linear infinite; padding: 40px 0;}
        .sponsor-logo { padding: 15px 30px; border: 1px solid var(--dark3); border-radius: 8px; color: var(--gray); font-weight: bold; white-space: nowrap; }

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
                <button onClick={() => router.push("/dashboard")} className="btn-primary">
                  <i className="fa fa-arrow-right"></i> Volver al Panel
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="btn-primary">
                  <i className="fa fa-shield-halved"></i> Acceso Administrador
                </button>
              )}
            </div>
          </div>
          <aside className="hero-panel reveal" style={{ transitionDelay: '0.12s' }}>
            <div className="section-label">Centro publico</div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', lineHeight: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Gestion deportiva en vivo</h2>
            <p style={{ color: 'var(--gray)', lineHeight: 1.7, fontSize: 14 }}>Consulta torneos, posiciones, goleadores, partidos y comunicados desde una experiencia limpia y preparada para cualquier pantalla.</p>
            <div className="hero-panel-grid">
              <div className="hero-mini-card"><strong>{torneosActivos.length}</strong><span>Torneos activos</span></div>
              <div className="hero-mini-card"><strong>{visitas || 0}</strong><span>Visitas publicas</span></div>
              <div className="hero-mini-card"><strong>24/7</strong><span>Consulta en linea</span></div>
              <div className="hero-mini-card"><strong>GL</strong><span>Identidad oficial</span></div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-wrap" style={{ background: 'var(--dark)' }}>
        <div className="section-inner">
          <div className="reveal">
            <div className="section-label">Directorio Oficial</div>
            <h2 style={{ fontSize: '40px', textTransform: 'uppercase', marginBottom: '10px' }}>Ligas <span className="text-gold">Activas</span></h2>
            <p style={{ color: 'var(--gray)' }}>Transparencia absoluta. Selecciona tu torneo para acceder a la base de datos oficial.</p>
          </div>

          <div className="reveal" style={{ transitionDelay: '0.2s', marginTop: '40px' }}>
            {loading ? (
               <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gold)' }}>Cargando torneos...</div>
            ) : (
               <div className="tournament-grid">
                 {torneosActivos.length === 0 ? (
                   <p style={{ color: 'var(--gray)', padding: '20px' }}>Aún no hay torneos registrados en el sistema.</p>
                 ) : (
                   torneosActivos.map((torneo) => (
                     <Link href={`/torneo/${torneo.slug}`} key={torneo.id} style={{ textDecoration: 'none' }}>
                       <div className="tournament-card">
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
                       </div>
                     </Link>
                   ))
                 )}
               </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: 'var(--dark2)', borderTop: '1px solid var(--dark3)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
          <div className="section-label" style={{ justifyContent: 'center' }}>Auspiciantes Oficiales</div>
          <div className="sponsors-track reveal">
            {[
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
            ].map((sponsor, index) => <div className="sponsor-logo" key={`${sponsor}-${index}`}>{sponsor}</div>)}
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
