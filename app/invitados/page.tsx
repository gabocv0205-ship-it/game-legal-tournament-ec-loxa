"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function PortalInvitados() {
  const [tabla, setTabla] = useState<any[]>([]);

  useEffect(() => {
    // 1. Motor Matemático: Leer partidos del Administrador y calcular tabla en vivo
    const calcularTablaLive = () => {
      const guardados = localStorage.getItem('gl_partidos');
      if (guardados) {
        const partidos = JSON.parse(guardados);
        const tempTabla: any = {};
        partidos.forEach((p: any) => {
          if (!p.jugado) return;
          if (!tempTabla[p.local]) tempTabla[p.local] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, shield: p.localShield || null };
          if (!tempTabla[p.visitante]) tempTabla[p.visitante] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, shield: p.visitanteShield || null };
          
          tempTabla[p.local].pj += 1; tempTabla[p.visitante].pj += 1;
          tempTabla[p.local].gf += p.gl; tempTabla[p.visitante].gf += p.gv;
          tempTabla[p.local].gc += p.gv; tempTabla[p.visitante].gc += p.gl;

          if (p.gl > p.gv) { tempTabla[p.local].pts += 3; tempTabla[p.local].pg += 1; tempTabla[p.visitante].pp += 1;}
          else if (p.gv > p.gl) { tempTabla[p.visitante].pts += 3; tempTabla[p.visitante].pg += 1; tempTabla[p.local].pp += 1;}
          else { tempTabla[p.local].pts += 1; tempTabla[p.visitante].pts += 1; tempTabla[p.local].pe += 1; tempTabla[p.visitante].pe += 1; }
        });
        // Ordenar por Puntos, luego por Gol Diferencia
        const ordenada = Object.entries(tempTabla).sort((a: any, b: any) => b[1].pts - a[1].pts || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc));
        setTabla(ordenada);
      }
    };
    calcularTablaLive();

    // 2. Custom Cursor Animado
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

    // 3. Animaciones Reveal al hacer scroll
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));

    return () => { document.removeEventListener('mousemove', moveCursor); };
  }, []);

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
        .topbar-marquee span { display: inline-block; padding-left: 100%; animation: marquee 25s linear infinite; }
        @keyframes marquee { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .hero { position: relative; min-height: 90vh; display: flex; align-items: center; padding: 4rem 2rem; overflow:hidden;}
        .hero-bg { position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(27,107,47,0.2) 0%, var(--black) 80%); z-index: -1; }
        .hero-title { font-family: var(--font-display); font-size: clamp(40px, 8vw, 90px); line-height: 0.9; text-transform: uppercase; margin-bottom: 20px;}
        .text-gold { color: var(--gold); }
        .btn-primary { background: linear-gradient(135deg, var(--gold) 0%, #A07810 100%); color: var(--black); padding: 12px 28px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; transition: 0.3s;}
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(212,160,23,0.4); }
        .section-label { color: var(--gold); font-weight: bold; letter-spacing: 3px; text-transform: uppercase; font-size: 14px; margin-bottom: 10px; display: flex; align-items: center; gap:10px;}
        .section-label::before { content: ''; width: 30px; height: 2px; background: var(--gold); }
        .standings-card { background: var(--dark2); border: 1px solid var(--dark3); border-radius: 8px; overflow: hidden; margin-top:30px;}
        .standings-table { width: 100%; border-collapse: collapse; text-align: center; }
        .standings-table th { background: var(--dark3); color: var(--gray); padding: 15px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;}
        .standings-table td { padding: 15px; border-bottom: 1px solid var(--dark3); font-weight: bold;}
        .standings-table tr:hover td { background: rgba(255,255,255,0.05); }
        .pos-1 { background: var(--gold); color: black; padding: 4px 10px; border-radius: 4px; }
        .pos-2 { background: silver; color: black; padding: 4px 10px; border-radius: 4px; }
        .pos-3 { background: #CD7F32; color: black; padding: 4px 10px; border-radius: 4px; }
        .reveal { opacity: 0; transform: translateY(30px); transition: 0.8s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .sponsors-track { display: flex; gap: 40px; animation: marquee 20s linear infinite; padding: 40px 0;}
        .sponsor-logo { padding: 15px 30px; border: 1px solid var(--dark3); border-radius: 8px; color: var(--gray); font-weight: bold; }
      `}} />

      <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div>

      <div className="topbar">
        <div className="topbar-marquee">
          <span><i className="fa fa-trophy"></i> Champions GAME-LEGAL 2026 — ¡Inscripciones abiertas! &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <i className="fa fa-futbol"></i> Gran Final — Estadio Loja — 15 Jun</span>
        </div>
      </div>

      <section className="hero">
        <div className="hero-bg"></div>
        <div style={{ zIndex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div className="reveal">
            <div style={{ display: 'inline-block', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px' }}>
              <span style={{ display:'inline-block', width:'8px',height:'8px',background:'var(--green-light)',borderRadius:'50%',marginRight:'8px'}}></span>
              TEMPORADA 2026 • LOJA
            </div>
            <h1 className="hero-title">
              <span style={{ display: 'block' }}>El Fútbol</span>
              <span className="text-gold" style={{ display: 'block' }}>que une</span>
              <span style={{ display: 'block', color: 'transparent', WebkitTextStroke: '2px white' }}>a Loja</span>
            </h1>
            <p style={{ color: 'var(--gray)', fontSize: '18px', maxWidth: '500px', marginBottom: '40px', lineHeight: '1.6' }}>
              La plataforma oficial de torneos de fútbol más innovadora de la provincia de Loja. Estadísticas en vivo, transparencia y pasión.
            </p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <Link href="/dashboard" className="btn-primary"><i className="fa fa-shield-halved"></i> Acceso Administrador</Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 20px', background: 'var(--dark)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="reveal">
            <div className="section-label">Estadísticas en vivo</div>
            <h2 style={{ fontSize: '40px', textTransform: 'uppercase', marginBottom: '10px' }}>Tabla de <span className="text-gold">Posiciones</span></h2>
            <p style={{ color: 'var(--gray)' }}>Conectado directamente a la base de datos oficial del torneo.</p>
          </div>

          <div className="standings-card reveal" style={{ transitionDelay: '0.2s' }}>
            <div style={{ padding: '20px', background: 'var(--dark3)', borderBottom: '1px solid var(--dark2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--gold)' }}><i className="fa fa-trophy"></i> Copa GAME-LEGAL</h3>
              <span style={{ fontSize: '12px', background: 'var(--green)', padding: '3px 10px', borderRadius: '15px' }}>En curso</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="standings-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>POS</th>
                    <th style={{ textAlign: 'left' }}>EQUIPO</th>
                    <th>PJ</th>
                    <th>PG</th>
                    <th>PE</th>
                    <th>PP</th>
                    <th>GF</th>
                    <th>GC</th>
                    <th>GD</th>
                    <th style={{ color: 'var(--gold)', fontSize: '14px' }}>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '40px', color: 'var(--gray)' }}>Aún no hay partidos registrados en el sistema.</td></tr>
                  ) : (
                    tabla.map((fila, index) => {
                      const posClass = index === 0 ? 'pos-1' : index === 1 ? 'pos-2' : index === 2 ? 'pos-3' : '';
                      const gd = fila[1].gf - fila[1].gc;
                      return (
                        <tr key={index}>
                          <td><span className={posClass}>{index + 1}</span></td>
                          <td style={{ textAlign: 'left', fontSize: '16px', letterSpacing: '1px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                              {fila[1].shield ? <Image src={fila[1].shield} alt="" width={30} height={30} unoptimized style={{ width: '30px', height: '30px', objectFit: 'contain' }} /> : <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--dark3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}><i className="fa fa-shield-halved"></i></span>}
                              {fila[0]}
                            </span>
                          </td>
                          <td style={{ color: 'var(--gray)' }}>{fila[1].pj}</td>
                          <td>{fila[1].pg}</td>
                          <td>{fila[1].pe}</td>
                          <td>{fila[1].pp}</td>
                          <td style={{ color: 'var(--green-light)' }}>{fila[1].gf}</td>
                          <td style={{ color: '#E74C3C' }}>{fila[1].gc}</td>
                          <td>{gd > 0 ? `+${gd}` : gd}</td>
                          <td style={{ color: 'var(--gold-light)', fontSize: '20px' }}>{fila[1].pts}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: 'var(--dark2)', borderTop: '1px solid var(--dark3)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
          <div className="section-label" style={{ justifyContent: 'center' }}>Auspiciantes Oficiales</div>
          <div className="sponsors-track reveal">
            <div className="sponsor-logo">Banco Loja</div>
            <div className="sponsor-logo">Deportes XL</div>
            <div className="sponsor-logo">Almacenes La Ganga</div>
            <div className="sponsor-logo">Radio Ondas</div>
            <div className="sponsor-logo">Constructora Sur</div>
            {/* Duplicados para efecto infinito */}
            <div className="sponsor-logo">Banco Loja</div>
            <div className="sponsor-logo">Deportes XL</div>
            <div className="sponsor-logo">Almacenes La Ganga</div>
          </div>
        </div>
      </section>

      <footer style={{ background: 'var(--black)', padding: '40px 20px', textAlign: 'center', color: 'var(--gray)', fontSize: '14px', borderTop: '1px solid var(--dark3)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--white)', letterSpacing: '3px', marginBottom: '10px' }}>GAME-LEGAL</h2>
        <p style={{ marginBottom: '20px' }}>© 2026 Torneos Loja. Todos los derechos reservados.</p>
        <p style={{ color: 'var(--gold)' }}>Hecho con ❤️ para el fútbol lojano.</p>
      </footer>
    </>
  );
}
