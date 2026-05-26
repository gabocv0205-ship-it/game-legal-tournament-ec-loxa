"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();
  
  // Estados para las Estadísticas Públicas
  const [tabla, setTabla] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Estados para el Modal de Login (Admin)
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    cargarEstadisticasPublicas();
  }, []);

  const cargarEstadisticasPublicas = async () => {
    try {
      const { data: tourney } = await supabase.from('tournaments').select('id').limit(1).single();
      if (!tourney) return;

      const { data: teams } = await supabase.from("teams").select("*").eq("tournament_id", tourney.id);
      const { data: matches } = await supabase.from("matches")
        .select("*, home:home_team_id(id, name, shield_url), away:away_team_id(id, name, shield_url)")
        .eq("tournament_id", tourney.id)
        .eq("status", "finished");

      // Calcular Tabla
      const stats: Record<string, any> = {};
      teams?.forEach(t => {
        stats[t.id] = { id: t.id, name: t.name, shield: t.shield_url, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
      });

      matches?.forEach(m => {
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

      const tablaArray = Object.values(stats).map(s => ({ ...s, gd: s.gf - s.gc }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
      setTabla(tablaArray);

      // Calcular Goleadores
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
        setGoleadores(Object.values(golesObj).sort((a, b) => b.goles - a.goles).slice(0, 5)); // Top 5
      }
    } catch (error) {
      console.error("Error cargando estadísticas", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Credenciales incorrectas. Acceso denegado.");
      setAuthLoading(false);
    } else {
      router.push("/dashboard/partidos"); // Redirige al panel principal del admin
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans selection:bg-[#D4A017] selection:text-black">
      
      {/* BARRA SUPERIOR (TOPBAR) */}
      <div className="bg-[#141414] border-b border-[#2e2e2e] py-2 px-6 flex justify-between items-center text-[10px] md:text-xs font-bold tracking-widest uppercase text-gray-400">
        <div className="flex gap-4">
          <span className="flex items-center gap-2"><span className="text-[#D4A017]">🏆</span> GAME-LEGAL PRO 2026</span>
          <span className="hidden md:flex items-center gap-2 text-green-500">Inscripciones Abiertas</span>
        </div>
        <button onClick={() => setShowLogin(true)} className="text-[#D4A017] hover:text-white transition-colors flex items-center gap-2">
          🛡️ Acceso Administrador
        </button>
      </div>

      {/* HERO SECTION (PORTADA ÉPICA) */}
      <div className="relative pt-20 pb-16 px-6 md:px-20 overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#D4A017]/10 rounded-full blur-[100px] -z-10" />
        
        <div className="max-w-4xl relative z-10">
          <div className="inline-block border border-[#D4A017]/50 bg-[#D4A017]/10 px-4 py-1.5 rounded-full mb-6">
            <span className="text-[#D4A017] text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse" />
              Temporada Oficial 2026
            </span>
          </div>
          
          {/* NUEVO COPY: Universal y Premium */}
          <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase">
            LA ÉLITE DEL <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4A017] to-yellow-600">
              FÚTBOL AMATEUR
            </span>
          </h1>
          
          <p className="mt-8 text-lg text-gray-400 max-w-2xl font-medium leading-relaxed">
            La plataforma deportiva definitiva. Vive la pasión del torneo con estadísticas en tiempo real, transparencia absoluta y un nivel de competencia puramente profesional.
          </p>
        </div>
      </div>

      {/* SECCIÓN PÚBLICA DE ESTADÍSTICAS */}
      <div className="px-6 md:px-20 pb-20 relative z-10">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-8 border-l-4 border-[#D4A017] pl-4">Centro de Estadísticas</h2>
        
        {loadingStats ? (
          <div className="flex justify-center py-10"><div className="w-10 h-10 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* TABLA DE POSICIONES PÚBLICA */}
            <div className="lg:col-span-2 bg-[#141414] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-2xl">
              <div className="bg-[#1c1c1c] px-6 py-4 border-b border-[#2E2E2E]">
                <h3 className="text-[#D4A017] font-black uppercase tracking-widest text-xs">Clasificación General</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-sm text-white whitespace-nowrap">
                  <thead className="bg-[#0a0a0a] text-gray-500 uppercase text-[10px] tracking-widest border-b border-[#2E2E2E]">
                    <tr>
                      <th className="px-4 py-4 w-10">#</th>
                      <th className="px-4 py-4 text-left">Club</th>
                      <th className="px-3 py-4">PJ</th>
                      <th className="px-3 py-4">GD</th>
                      <th className="px-4 py-4 font-black text-[#D4A017]">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E2E2E]">
                    {tabla.slice(0, 10).map((s, index) => (
                      <tr key={s.id} className="hover:bg-[#1c1c1c] transition-colors">
                        <td className="px-4 py-4 font-black text-gray-500">{index + 1}</td>
                        <td className="px-4 py-4 text-left font-bold flex items-center gap-3">
                          {s.shield ? <img src={s.shield} className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-[#2e2e2e] rounded-full"></div>}
                          {s.name}
                        </td>
                        <td className="px-3 py-4 font-bold text-gray-400">{s.pj}</td>
                        <td className="px-3 py-4 font-bold text-gray-400">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                        <td className="px-4 py-4 font-black text-lg text-[#D4A017]">{s.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOP GOLEADORES PÚBLICO */}
            <div className="bg-[#141414] rounded-2xl border border-[#2E2E2E] overflow-hidden shadow-2xl h-fit">
              <div className="bg-[#1c1c1c] px-6 py-4 border-b border-[#2E2E2E]">
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Top Artilleros</h3>
              </div>
              <div className="p-2">
                {goleadores.length === 0 ? (
                  <p className="text-center text-gray-500 text-xs py-10 uppercase tracking-widest">Aún no hay goles</p>
                ) : (
                  goleadores.map((g, i) => (
                    <div key={g.id} className="flex items-center justify-between p-4 border-b border-[#2e2e2e] last:border-0 hover:bg-[#1c1c1c] rounded-xl transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-[#D4A017] font-black text-lg w-4">{i + 1}</span>
                        <div>
                          <p className="text-white font-bold text-sm uppercase">{g.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{g.team}</p>
                        </div>
                      </div>
                      <div className="bg-[#0a0a0a] border border-[#2e2e2e] px-3 py-1 rounded text-[#D4A017] font-black font-mono">
                        {g.goles}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* MODAL DE LOGIN (ADMINISTRADOR) */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] w-full max-w-sm border border-[#D4A017]/50 rounded-2xl shadow-[0_0_50px_rgba(212,160,23,0.15)] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A017]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="p-8 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-white uppercase tracking-wider">Acceso Pro</h3>
                <button onClick={() => setShowLogin(false)} className="text-gray-500 hover:text-white font-black">X</button>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full mt-2 bg-[#141414] border border-[#2e2e2e] text-white p-3 rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors"
                    placeholder="admin@gamelegal.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#D4A017] uppercase tracking-widest">Contraseña</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full mt-2 bg-[#141414] border border-[#2e2e2e] text-white p-3 rounded-xl focus:outline-none focus:border-[#D4A017] transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full mt-4 py-4 bg-gradient-to-r from-[#D4A017] to-yellow-600 text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(212,160,23,0.3)] hover:scale-[1.02] transition-transform"
                >
                  {authLoading ? "Verificando..." : "Ingresar al Panel"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
