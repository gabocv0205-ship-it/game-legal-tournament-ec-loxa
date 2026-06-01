"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import Link from 'next/link';

export default function GameLegalLandingPage() {
  const router = useRouter();
  
  // Estados para los torneos y el Login
  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    async function cargarDirectorio() {
      // Extraemos todos los torneos públicos para mostrarlos en el lobby
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, slug, created_at")
        .order("created_at", { ascending: false });
      
      if (data) setTorneosActivos(data);
      setLoading(false);
    }
    cargarDirectorio();

    // Efectos de cursor premium
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

    return () => { document.removeEventListener('mousemove', moveCursor); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Credenciales incorrectas. Acceso denegado.");
      setAuthLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <style dangerouslySetInnerHTML={{__html: `
        :root { --gold: #D4A017; --black: #0D0D0D; --dark: #141414; --dark2: #1C1C1C; --white: #FFFFFF; --gray: #8A8A8A; --font-heading: system-ui, sans-serif; --font-display: impact, sans-serif; }
        body { background: var(--black); color: var(--white); overflow-x: hidden; font-family: var(--font-heading); cursor: none;}
        .cursor-dot, .cursor-ring { position: fixed; pointer-events: none; z-index: 99999; transform: translate(-50%, -50%); }
        .cursor-dot { width: 8px; height: 8px; background: var(--gold); border-radius: 50%; }
        .cursor-ring { width: 36px; height: 36px; border: 2px solid rgba(212,160,23,0.5); border-radius: 50%; transition: width 0.3s, height 0.3s; }
        
        .hero { position: relative; min-height: 70vh; display: flex; align-items: center; padding: 4rem 2rem; overflow:hidden;}
        .hero-bg { position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(212,160,23,0.15) 0%, var(--black) 70%); z-index: -1; }
        .hero-title { font-family: var(--font-display); font-size: clamp(50px, 8vw, 100px); line-height: 0.9; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 2px;}
        
        .btn-primary { background: linear-gradient(135deg, var(--gold) 0%, #A07810 100%); color: var(--black); padding: 12px 28px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; transition: 0.3s; border: none; cursor: none;}
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(212,160,23,0.4); }
        
        .tournament-card { background: var(--dark2); border: 1px solid #2E2E2E; padding: 25px; border-radius: 12px; transition: 0.3s; cursor: none; display: flex; flex-direction: column; justify-content: space-between;}
        .tournament-card:hover { border-color: var(--gold); transform: translateY(-5px); box-shadow: 0 10px 30px rgba(212,160,23,0.1); }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(5px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;}
        .modal-content { background: var(--dark2); border: 1px solid rgba(212,160,23,0.5); border-radius: 12px; padding: 30px; width: 100%; max-width: 400px; box-shadow: 0 0 40px rgba(212,160,23,0.15); position: relative;}
        .modal-close { position: absolute; top: 15px; right: 20px; background: transparent; border: none; color: var(--gray); font-size: 20px; font-weight: bold; cursor: none; transition: 0.3s;}
        .modal-close:hover { color: var(--white); }
        .modal-input { width: 100%; background: var(--dark); border: 1px solid #2E2E2E; color: var(--white); padding: 12px; border-radius: 8px; margin-top: 8px; margin-bottom: 20px; outline: none; transition: 0.3s;}
        .modal-input:focus { border-color: var(--gold); }
      `}} />

      <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div>

      {/* NAVEGACIÓN SUPERIOR */}
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2E2E2E' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', letterSpacing: '2px', color: 'var(--white)' }}>
          GAME-<span style={{ color: 'var(--gold)' }}>LEGAL</span>
        </div>
        <button onClick={() => setShowLogin(true)} style={{ background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '8px 20px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', cursor: 'none' }}>
          <i className="fa fa-lock"></i> Acceso Pro
        </button>
      </nav>

      {/* HERO SECTION - LA VENTA DEL SOFTWARE */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div style={{ zIndex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px' }}>
            <span style={{ display:'inline-block', width:'8px',height:'8px',background:'#27A04A',borderRadius:'50%',marginRight:'8px', animation: 'pulse 2s infinite'}}></span>
            PLATAFORMA SAAS DEPORTIVA
          </div>
          <h1 className="hero-title">
            <span style={{ display: 'block', color: 'transparent', WebkitTextStroke: '1px var(--gray)' }}>El Motor de los</span>
            <span style={{ color: 'var(--gold)' }}>Mejores Torneos</span>
          </h1>
          <p style={{ color: 'var(--gray)', fontSize: '18px', maxWidth: '700px', margin: '0 auto 40px', lineHeight: '1.6' }}>
            GAME-LEGAL PRO es el sistema de gestión deportiva más avanzado. Transparencia, estadísticas en tiempo real y administración financiera en una sola plataforma.
          </p>
          <button onClick={() => setShowLogin(true)} className="btn-primary">
            Organizar un Torneo
          </button>
        </div>
      </section>

      {/* DIRECTORIO DE TORNEOS - EL HUB PARA JUGADORES */}
      <section style={{ padding: '80px 20px', background: 'var(--dark)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '36px', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '2px' }}>Explorar <span style={{ color: 'var(--gold)' }}>Ligas Activas</span></h2>
            <p style={{ color: 'var(--gray)' }}>¿Eres jugador o hincha? Selecciona tu torneo para ver las estadísticas oficiales.</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--gold)' }}>Cargando torneos...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {torneosActivos.length === 0 ? (
                <p style={{ color: 'var(--gray)', textAlign: 'center', gridColumn: '1 / -1' }}>No hay torneos públicos registrados en este momento.</p>
              ) : (
                torneosActivos.map((torneo) => (
                  <Link href={`/torneo/${torneo.slug}`} key={torneo.id} style={{ textDecoration: 'none' }}>
                    <div className="tournament-card">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                          <div style={{ width: '40px', height: '40px', background: '#2E2E2E', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏆</div>
                          <span style={{ background: 'rgba(39,160,74,0.1)', color: '#27A04A', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Oficial</span>
                        </div>
                        <h3 style={{ color: 'var(--white)', fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '5px' }}>{torneo.name}</h3>
                        <p style={{ color: 'var(--gray)', fontSize: '12px' }}>Gestión integral GAME-LEGAL</p>
                      </div>
                      <div style={{ marginTop: '20px', borderTop: '1px solid #2E2E2E', paddingTop: '15px', color: 'var(--gold)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        Ver Estadísticas <i className="fa fa-arrow-right"></i>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER CORPORATIVO */}
      <footer style={{ background: 'var(--black)', padding: '40px 20px', textAlign: 'center', color: 'var(--gray)', fontSize: '14px', borderTop: '1px solid #2E2E2E' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--white)', letterSpacing: '3px', marginBottom: '10px' }}>GAME-LEGAL STUDIO</h2>
        <p style={{ marginBottom: '20px' }}>El poder detrás del deporte. © 2026. Todos los derechos reservados.</p>
      </footer>

      {/* MODAL DE LOGIN */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setShowLogin(false)} className="modal-close">✖</button>
            <h3 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '5px', color: 'var(--white)' }}>Acceso Pro</h3>
            <p style={{ color: 'var(--gold)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '25px' }}>Panel de Administración SaaS</p>
            
            <form onSubmit={handleLogin}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="modal-input"
                  placeholder="organizador@liga.com"
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
