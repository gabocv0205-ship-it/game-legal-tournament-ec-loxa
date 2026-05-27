"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabase";

export default function PortalPrincipal() {
  const router = useRouter();

  // Estados de Datos
  const [tabla, setTabla] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [visitas, setVisitas] = useState(0);
  const [activeTab, setActiveTab] = useState("posiciones");
  const [torneoDestacado, setTorneoDestacado] = useState<any>(null);

  // Estados del Modal de Login
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // 1. Motor Supabase: Cargar el torneo más reciente como "Vitrina"
    async function inicializarPortal() {
      try {
        await supabase.from("status_visits").insert([{}]);
        const { count } = await supabase.from("status_visits").select("*", { count: "exact", head: true });
        if (count) setVisitas(count);

        const { data: tourney } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(1).single();
        
        if (tourney) {
          setTorneoDestacado(tourney);
          const { data: teams } = await supabase.from("teams").select("*").eq("tournament_id", tourney.id);
          const { data: matches } = await supabase.from("matches")
            .select("*, home:home_team_id(id, name, shield_url), away:away_team_id(id, name, shield_url)")
            .eq("tournament_id", tourney.id)
            .order("match_date", { ascending: true });
          
          setPartidos(matches || []);

          const stats: Record<string, any> = {};
          teams?.forEach(t => {
            stats[t.id] = { id: t.id, name: t.name, shield: t.shield_url, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
          });

          matches?.filter(m => m.status === 'finished').forEach(m => {
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

          const matchIds = matches?.map(m => m.id) || [];
          if (matchIds.length > 0) {
            const { data: events } = await supabase.from("match_events")
              .select("*, players(full_name), teams(name)").in("match_id", matchIds).eq("event_type", "gol");
            const golesObj: Record<string, any> = {};
            events?.forEach(e => {
               const pId = e.player_id;
               if (!golesObj[pId]) golesObj[pId] = { id: pId, name: e.players?.full_name, team: e.teams?.name, goles: 0 };
               golesObj[pId].goles++;
            });
            setGoleadores(Object.values(golesObj).sort((a, b) => b.goles - a.goles).slice(0, 10));
          }
        }
      } catch (err) {
        console.error("Error cargando portal principal:", err);
      }
    }
    inicializarPortal();

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
        .text-gold { color: var(--gold); }
        .btn-primary { background: linear-gradient(135deg, var(--gold) 0%, #A07810 100%); color: var(--black); padding: 12px 28px; border-radius: 4px; font-weight: bold; text-transform: uppercase; display: inline-block; transition: 0.3s; border: none; cursor: none;}
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
        .sponsor-logo { padding: 15px 30px; border: 1px solid var(--dark3); border-radius: 8px; color: var(--gray); font-weight: bold; white-space: nowrap; }
        
        .tab-btn { flex: 1; padding: 15px; background: transparent; color: var(--white); font-weight: bold; text-transform: uppercase; border: none; cursor: none; transition: 0.3s; border-bottom: 2px solid transparent;}
        .tab-btn.active { background: rgba(212,160,23,0.1); color: var(--gold); border-bottom: 2px solid var(--gold); }
        .tab-btn:hover { background: rgba(255,255,255,0.05); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(5px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;}
        .modal-content { background: var(--dark2); border: 1px solid rgba(212,160,23,0.5); border-radius: 12px; padding: 30px; width: 100%; max-width: 400px; box-shadow: 0 0 40px rgba(212,160,23,0.15); position: relative;}
        .modal-close { position: absolute; top: 15px; right: 20px; background: transparent; border: none; color: var(--gray); font-size: 20px; font-weight: bold; cursor: none; transition: 0.3s;}
        .modal-close:hover { color: var(--white); }
        .modal-input { width: 100%; background: var(--dark); border: 1px solid var(--dark3); color: var(--white); padding: 12px; border-radius: 8px; margin-top: 8px; margin-bottom: 20px; outline: none; transition: 0.3s;}
        .modal-input:focus { border-color: var(--gold); }
      `}} />

      <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div>

      <div className="topbar">
        <div className="topbar-marquee">
          <span><i className="fa fa-trophy"></i> CHAMPIONS GAME-LEGAL 2026 — ¡DONDE NACEN LAS LEYENDAS! FORJA TU DESTINO EN LA CANCHA &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <i className="fa fa-futbol"></i> DEMUESTRA TU TALENTO — GLORIA, TRANSPARENCIA Y PASIÓN 🔥</span>
        </div>
      </div>

      <section className="hero">
        <div className="hero-bg"></div>
        <div style={{ zIndex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div className="reveal">
            <div style={{ display: 'inline-block', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '5px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px' }}>
              <span style={{ display:'inline-block', width:'8px',height:'8px',background:'var(--green-light)',borderRadius:'50%',marginRight:'8px', animation: 'pulse 2s infinite'}}></span>
              {torneoDestacado?.name || 'EDICIÓN PRO 2026'}
            </div>
            <h1 className="hero-title">
              <span style={{ display: 'block' }}>La Pasión</span>
              <span className="text-gold" style={{ display: 'block' }}>Que Forja</span>
              <span style={{ display: 'block', color: 'transparent', WebkitTextStroke: '2px white' }}>Campeones</span>
            </h1>
            <p style={{ color: 'var(--gray)', fontSize: '18px', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.6' }}>
              El torneo de fútbol amateur más prestigioso. Vive cada partido, analiza tus estadísticas en tiempo real y escribe tu nombre en la historia deportiva.
            </p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={() => setShowLogin(true)} className="btn-primary">
                <i className="fa fa-shield-halved"></i> Acceso Administrador
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 20px', background: 'var(--dark)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="reveal">
            <div className="section-label">Estadísticas en vivo</div>
            <h2 style={{ fontSize: '40px', textTransform: 'uppercase', marginBottom: '10px' }}>Datos <span className="text-gold">Oficiales</span></h2>
            <p style={{ color: 'var(--gray)' }}>Transparencia absoluta. Conectado directamente a la base de datos oficial del torneo.</p>
          </div>

          <div className="standings-card reveal" style={{ transitionDelay: '0.2s' }}>
            <div style={{ padding: '20px', background: 'var(--dark3)', borderBottom: '1px solid var(--dark2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--gold)' }}><i className="fa fa-trophy"></i> Copa GAME-LEGAL</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '12px', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '3px 10px', borderRadius: '15px' }}><i className="fa fa-eye"></i> {visitas} Visitas</span>
                <span style={{ fontSize: '12px', background: 'var(--green)', padding: '3px 10px', borderRadius: '15px' }}>En curso</span>
              </div>
            </div>

            <div style={{ display: 'flex', background: 'var(--dark2)', borderBottom: '1px solid var(--dark3)' }}>
              <button onClick={() => setActiveTab('posiciones')} className={`tab-btn ${activeTab === 'posiciones' ? 'active' : ''}`}>Posiciones</button>
              <button onClick={() => setActiveTab('partidos')} className={`tab-btn ${activeTab === 'partidos' ? 'active' : ''}`}>Partidos</button>
              <button onClick={() => setActiveTab('goleadores')} className={`tab-btn ${activeTab === 'goleadores' ? 'active' : ''}`}>Goleadores</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {/* VISTA 1: POSICIONES */}
              {activeTab === 'posiciones' && (
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
                      tabla.map((s, index) => {
                        const posClass = index === 0 ? 'pos-1' : index === 1 ? 'pos-2' : index === 2 ? 'pos-3' : '';
                        return (
                          <tr key={s.id}>
                            <td><span className={posClass}>{index + 1}</span></td>
                            <td style={{ textAlign: 'left', fontSize: '16px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {s.shield ? <img src={s.shield} style={{ width: '24px', height: '24px', objectFit: 'contain' }} /> : <div style={{ width: '24px', height: '24px', background: 'var(--dark3)', borderRadius: '50%' }}></div>}
                              {s.name}
                            </td>
                            <td style={{ color: 'var(--gray)' }}>{s.pj}</td>
                            <td>{s.pg}</td>
                            <td>{s.pe}</td>
                            <td>{s.pp}</td>
                            <td style={{ color: 'var(--green-light)' }}>{s.gf}</td>
                            <td style={{ color: '#E74C3C' }}>{s.gc}</td>
                            <td>{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                            <td style={{ color: 'var(--gold-light)', fontSize: '20px' }}>{s.pts}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* VISTA 2: PARTIDOS */}
              {activeTab === 'partidos' && (
                <div style={{ padding: '20px' }}>
                  {partidos.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>No hay encuentros programados.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {partidos.map((match) => (
                        <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--dark3)', padding: '15px', borderRadius: '8px', border: '1px solid var(--dark2)' }}>
                          <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
                            <div style={{ fontSize: '10px', color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '4px' }}>{match.stage || 'Fase de Grupos'} • Fecha {match.matchday}</div>
                            {match.home?.name}
                          </div>
                          <div style={{ padding: '5px 15px', background: 'var(--black)', borderRadius: '5px', margin: '0 20px', fontWeight: 'bold', color: 'var(--gold)', fontSize: '20px', fontFamily: 'monospace' }}>
                            {match.status === "finished" ? `${match.home_goals} - ${match.away_goals}` : "VS"}
                          </div>
                          <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold' }}>{match.away?.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VISTA 3: GOLEADORES */}
              {activeTab === 'goleadores' && (
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>TOP</th>
                      <th style={{ textAlign: 'left' }}>JUGADOR</th>
                      <th style={{ textAlign: 'left' }}>CLUB</th>
                      <th style={{ color: 'var(--gold)', fontSize: '14px' }}>GOLES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goleadores.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '40px', color: 'var(--gray)' }}>Aún no hay goleadores registrados.</td></tr>
                    ) : (
                      goleadores.map((player, index) => (
                        <tr key={player.id}>
                          <td><span className={index === 0 ? 'pos-1' : ''}>{index + 1}</span></td>
                          <td style={{ textAlign: 'left', fontSize: '16px', fontWeight: 'bold' }}>{player.name}</td>
                          <td style={{ textAlign: 'left', color: 'var(--gray)' }}>{player.team || "Libre"}</td>
                          <td style={{ color: 'var(--gold-light)', fontSize: '20px' }}>{player.goles || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
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
