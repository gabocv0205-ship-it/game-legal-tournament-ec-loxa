"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

// ============================================================
// ICONS (Inline SVG)
// ============================================================
const Icon = ({ path, size = 20, className = "" }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path} /></svg>
);
const Icons = {
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  dollar: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  plus: "M12 5v14M5 12h14",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  bars: "M3 12h18M3 6h18M3 18h18"
};

// ============================================================
// COMPONENTES UI
// ============================================================
const Badge = ({ label, color = "blue" }: any) => {
  const colors: any = { blue: "bg-blue-100 text-blue-800", green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800", yellow: "bg-yellow-100 text-yellow-800", purple: "bg-purple-100 text-purple-800" };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[color] || colors.blue}`}>{label}</span>;
};

const Card = ({ children, className = "" }: any) => <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>;

const StatCard = ({ icon, label, value, sub, color = "blue" }: any) => {
  const colors: any = { blue: "from-blue-500 to-blue-700", green: "from-emerald-500 to-emerald-700", orange: "from-orange-400 to-orange-600", purple: "from-violet-500 to-violet-700", red: "from-rose-500 to-rose-700" };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex justify-between items-start">
        <div><p className="text-sm opacity-80 font-medium">{label}</p><p className="text-3xl font-black mt-1">{value}</p>{sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}</div>
        <div className="bg-white/20 p-2 rounded-xl">{icon}</div>
      </div>
    </div>
  );
};

const Btn = ({ children, variant = "primary", className = "", ...props }: any) => {
  const v: any = { primary: "bg-blue-600 hover:bg-blue-700 text-white", danger: "bg-red-500 hover:bg-red-600 text-white", outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50" };
  return <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${v[variant]} ${className}`} {...props}>{children}</button>;
};

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function TournamentProDashboard() {
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // ESTADOS DE LA BASE DE DATOS LOCAL (Caché simulado)
  const [equipos, setEquipos] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [config, setConfig] = useState({
    torneoNombre: "Copa GAME-LEGAL 2026",
    inscripcion: 150,
    premio: 2000,
    estado: "active", // active | finished
    mejorJugador: "",
    mejorArquero: "",
    mejorDirigente: "",
    mejorBarra: ""
  });

  // Cargar datos al iniciar
  useEffect(() => {
    const eq = localStorage.getItem('gl_equipos'); if (eq) setEquipos(JSON.parse(eq));
    const jug = localStorage.getItem('gl_jugadores'); if (jug) setJugadores(JSON.parse(jug));
    const part = localStorage.getItem('gl_partidos'); if (part) setPartidos(JSON.parse(part));
    const conf = localStorage.getItem('gl_config'); if (conf) setConfig(JSON.parse(conf));
  }, []);

  // Guardar datos al cambiar
  useEffect(() => { localStorage.setItem('gl_equipos', JSON.stringify(equipos)); }, [equipos]);
  useEffect(() => { localStorage.setItem('gl_jugadores', JSON.stringify(jugadores)); }, [jugadores]);
  useEffect(() => { localStorage.setItem('gl_partidos', JSON.stringify(partidos)); }, [partidos]);
  useEffect(() => { localStorage.setItem('gl_config', JSON.stringify(config)); }, [config]);

  // --- VISTA 1: DASHBOARD ---
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a3a6b] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><span className="text-2xl">🏆</span><span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Panel de Control Oficial</span></div>
          <h1 className="text-4xl md:text-5xl font-black mb-2">{config.torneoNombre}</h1>
          <p className="text-blue-200 text-sm max-w-md">Gestiona inscripciones, genera fixtures, controla estadísticas y mantén la contabilidad al día en tiempo real.</p>
          {config.estado === "finished" && (
            <div className="mt-4 bg-red-500 text-white font-bold px-4 py-2 rounded-lg inline-block text-sm">
              🔒 TORNEO FINALIZADO
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Icon path={Icons.users} className="text-white" />} label="Equipos" value={equipos.length} sub="Inscritos" color="blue" />
        <StatCard icon={<Icon path={Icons.shield} className="text-white" />} label="Jugadores" value={jugadores.length} sub="Verificados" color="purple" />
        <StatCard icon={<Icon path={Icons.calendar} className="text-white" />} label="Partidos" value={partidos.length} sub="Programados" color="green" />
        <StatCard icon={<Icon path={Icons.alert} className="text-white" />} label="Sancionados" value={jugadores.filter(j => j.suspendido).length} sub="Inhabilitados" color="red" />
      </div>
    </div>
  );

  // --- VISTA 2: EQUIPOS Y FINANZAS ---
  const renderEquipos = () => {
    const [nombreEq, setNombreEq] = useState(""); const [logo, setLogo] = useState("⚽"); const [abono, setAbono] = useState(0);
    const agregarEquipo = (e: any) => {
      e.preventDefault();
      if(!nombreEq) return;
      setEquipos([...equipos, { id: Date.now().toString(), nombre: nombreEq, logo, abono, deuda: config.inscripcion - abono }]);
      setNombreEq(""); setAbono(0);
    };
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-gray-900">Gestión de Clubes</h2></div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="p-6 h-fit">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Icon path={Icons.plus} size={18}/> Inscribir Equipo</h3>
            <form onSubmit={agregarEquipo} className="space-y-4">
              <div><label className="text-xs font-bold text-gray-500">Nombre</label><input type="text" value={nombreEq} onChange={e=>setNombreEq(e.target.value)} className="w-full p-2 border rounded-xl text-sm bg-gray-50" required/></div>
              <div><label className="text-xs font-bold text-gray-500">Escudo / Emoji</label><input type="text" value={logo} onChange={e=>setLogo(e.target.value)} className="w-full p-2 border rounded-xl text-xl text-center bg-gray-50"/></div>
              <div><label className="text-xs font-bold text-gray-500">Abono Inicial ($) - Inscripción total: ${config.inscripcion}</label><input type="number" value={abono} onChange={e=>setAbono(parseFloat(e.target.value))} className="w-full p-2 border rounded-xl text-sm bg-gray-50"/></div>
              <Btn className="w-full justify-center">Registrar Club</Btn>
            </form>
          </Card>
          <div className="lg:col-span-2 space-y-3">
            {equipos.map(eq => (
              <Card key={eq.id} className="p-4 flex justify-between items-center hover:border-blue-500 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-3xl bg-gray-100 w-12 h-12 flex justify-center items-center rounded-full">{eq.logo}</span>
                  <div><h4 className="font-bold text-lg">{eq.nombre}</h4><p className="text-xs text-gray-500">{jugadores.filter(j => j.idEquipo === eq.id).length} Jugadores registrados</p></div>
                </div>
                <div className="text-right">
                  <Badge label={eq.deuda <= 0 ? "✓ Pagado" : `Debe $${eq.deuda}`} color={eq.deuda <= 0 ? "green" : "red"} />
                  <button onClick={() => { if(confirm("¿Borrar equipo?")) setEquipos(equipos.filter(e => e.id !== eq.id)) }} className="block mt-2 text-xs text-red-500 font-bold hover:underline ml-auto">Eliminar</button>
                </div>
              </Card>
            ))}
            {equipos.length === 0 && <p className="text-gray-400 text-center py-10 font-bold">No hay equipos registrados.</p>}
          </div>
        </div>
      </div>
    );
  };

  // --- VISTA 3: JUGADORES Y SANCIONES ---
  const renderJugadores = () => {
    const [idEq, setIdEq] = useState(""); const [nombreJ, setNombreJ] = useState(""); const [cedula, setCedula] = useState("");
    const [alerta, setAlerta] = useState("");
    
    const agregarJugador = (e: any) => {
      e.preventDefault(); setAlerta("");
      if(!idEq || !nombreJ || !cedula) return;
      if(jugadores.find(j => j.cedula === cedula)) { setAlerta(`🚫 FRAUDE: Cédula ${cedula} ya registrada.`); return; }
      setJugadores([...jugadores, { id: Date.now().toString(), idEquipo: idEq, nombre: nombreJ, cedula, goles: 0, amarillas: 0, rojas: 0, suspendido: false }]);
      setNombreJ(""); setCedula("");
    };

    const actualizarTarjeta = (id: string, tipo: 'amarilla'|'roja') => {
      setJugadores(jugadores.map(j => {
        if(j.id !== id) return j;
        const nJ = { ...j };
        if(tipo === 'amarilla') nJ.amarillas += 1;
        if(tipo === 'roja') nJ.rojas += 1;
        nJ.suspendido = (nJ.amarillas >= 3 || nJ.rojas >= 1);
        return nJ;
      }));
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-gray-900">Control de Plantillas y Sanciones</h2>
        {alerta && <div className="bg-red-100 text-red-800 p-3 rounded-xl font-bold flex items-center gap-2"><Icon path={Icons.alert} size={18}/> {alerta}</div>}
        <Card className="p-4 bg-slate-50">
          <form onSubmit={agregarJugador} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]"><label className="text-xs font-bold text-gray-500">Equipo</label>
              <select value={idEq} onChange={e=>setIdEq(e.target.value)} className="w-full p-2 border rounded-xl text-sm" required>
                <option value="">Seleccione Equipo...</option>{equipos.map(e => <option key={e.id} value={e.id}>{e.logo} {e.nombre}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]"><label className="text-xs font-bold text-gray-500">Cédula</label><input type="text" value={cedula} onChange={e=>setCedula(e.target.value)} className="w-full p-2 border rounded-xl text-sm" required/></div>
            <div className="flex-[2] min-w-[200px]"><label className="text-xs font-bold text-gray-500">Nombre del Jugador</label><input type="text" value={nombreJ} onChange={e=>setNombreJ(e.target.value)} className="w-full p-2 border rounded-xl text-sm" required/></div>
            <Btn>Fichar Jugador</Btn>
          </form>
        </Card>

        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-500"><tr><th className="p-3">Cédula</th><th className="p-3">Jugador</th><th className="p-3">Equipo</th><th className="p-3 text-center">Tarjetas</th><th className="p-3 text-center">Estado</th><th className="p-3 text-center">Acción</th></tr></thead>
            <tbody className="divide-y">
              {jugadores.map(j => {
                const eq = equipos.find(e => e.id === j.idEquipo);
                return (
                  <tr key={j.id} className={j.suspendido ? "bg-red-50" : ""}>
                    <td className="p-3 font-mono font-bold text-blue-600">{j.cedula}</td><td className="p-3 font-bold">{j.nombre}</td>
                    <td className="p-3">{eq?.logo} {eq?.nombre}</td>
                    <td className="p-3 text-center text-lg">{j.amarillas > 0 && `🟨x${j.amarillas}`} {j.rojas > 0 && `🟥x${j.rojas}`}</td>
                    <td className="p-3 text-center">{j.suspendido ? <Badge label="🚫 Suspendido" color="red"/> : <Badge label="✓ Habilitado" color="green"/>}</td>
                    <td className="p-3 text-center">
                      <button onClick={()=>actualizarTarjeta(j.id, 'amarilla')} className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded mr-1">🟨</button>
                      <button onClick={()=>actualizarTarjeta(j.id, 'roja')} className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded mr-1">🟥</button>
                      <button onClick={()=>{if(confirm("Borrar jugador?")) setJugadores(jugadores.filter(x => x.id !== j.id))}} className="px-2 py-1 bg-gray-200 text-red-600 rounded"><Icon path={Icons.trash} size={14}/></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  };

  // --- VISTA 4: PARTIDOS ---
  const renderPartidos = () => {
    const [fecha, setFecha] = useState(""); const [eqLocal, setEqLocal] = useState(""); const [eqVisita, setEqVisita] = useState("");
    
    const agregarPartido = (e: any) => {
      e.preventDefault();
      const loc = equipos.find(eq => eq.id === eqLocal)?.nombre;
      const vis = equipos.find(eq => eq.id === eqVisita)?.nombre;
      if(!loc || !vis || loc === vis) { alert("Selecciona equipos válidos diferentes"); return; }
      
      setPartidos([...partidos, { id: Date.now(), local: loc, visitante: vis, gl: 0, gv: 0, jugado: false, fecha }]);
      setEqLocal(""); setEqVisita("");
    };

    const anotarGol = (idPartido: number, equipo: 'local'|'visitante') => {
      if (config.estado === "finished") {
        alert("El torneo ha finalizado. No se pueden modificar resultados.");
        return;
      }
      setPartidos(partidos.map(p => {
        if(p.id !== idPartido) return p;
        return { ...p, gl: equipo === 'local' ? p.gl + 1 : p.gl, gv: equipo === 'visitante' ? p.gv + 1 : p.gv, jugado: true };
      }));
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-gray-900">Calendario y Resultados Oficiales</h2>
        <Card className="p-4 bg-purple-50 border-purple-100">
          <form onSubmit={agregarPartido} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1"><label className="text-xs font-bold text-gray-500">Fecha/Hora</label><input type="datetime-local" value={fecha} onChange={e=>setFecha(e.target.value)} className="w-full p-2 border rounded-xl text-sm" required disabled={config.estado === "finished"}/></div>
            <div className="flex-1"><label className="text-xs font-bold text-gray-500">Local</label>
              <select value={eqLocal} onChange={e=>setEqLocal(e.target.value)} className="w-full p-2 border rounded-xl text-sm" required disabled={config.estado === "finished"}><option value="">Seleccione...</option>{equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
            </div>
            <div className="font-black text-gray-400 pb-2">VS</div>
            <div className="flex-1"><label className="text-xs font-bold text-gray-500">Visitante</label>
              <select value={eqVisita} onChange={e=>setEqVisita(e.target.value)} className="w-full p-2 border rounded-xl text-sm" required disabled={config.estado === "finished"}><option value="">Seleccione...</option>{equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
            </div>
            <Btn disabled={config.estado === "finished"} className={config.estado === "finished" ? "opacity-50" : ""}>Programar</Btn>
          </form>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {partidos.map(p => (
            <Card key={p.id} className="p-5 text-center relative overflow-hidden group">
              {config.estado !== "finished" && (
                <button onClick={() => {if(confirm("Eliminar partido?")) setPartidos(partidos.filter(x => x.id !== p.id))}} className="absolute top-2 right-2 text-red-300 hover:text-red-600"><Icon path={Icons.trash} size={16}/></button>
              )}
              <div className="text-xs font-bold text-gray-400 mb-3">{new Date(p.fecha).toLocaleString()}</div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="font-black text-gray-900 text-lg md:text-xl leading-tight">{p.local}</p>
                  <button onClick={()=>anotarGol(p.id, 'local')} className="mt-2 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold hover:bg-blue-200">+ Gol Local</button>
                </div>
                <div className="bg-gray-900 text-white font-black text-2xl px-4 py-2 rounded-xl min-w-[80px]">
                  {p.gl} - {p.gv}
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-900 text-lg md:text-xl leading-tight">{p.visitante}</p>
                  <button onClick={()=>anotarGol(p.id, 'visitante')} className="mt-2 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold hover:bg-red-200">+ Gol Visita</button>
                </div>
              </div>
              {p.jugado && <div className="mt-4 text-xs font-bold text-emerald-600 bg-emerald-50 py-1 rounded">Resultado Guardado (Visible en Portal)</div>}
            </Card>
          ))}
          {partidos.length === 0 && <p className="col-span-2 text-center text-gray-400 font-bold py-10">Agrega el primer partido para iniciar el torneo.</p>}
        </div>
      </div>
    );
  };

  // --- VISTA 5: CONFIGURACIÓN Y PREMIACIÓN ---
  const renderConfiguracion = () => {
    const handleCierre = () => {
      if(confirm("¿Estás seguro de FINALIZAR el torneo? Esta acción publicará a los ganadores en el portal principal y bloqueará nuevas ediciones.")){
        setConfig({ ...config, estado: "finished" });
        alert("Torneo finalizado con éxito. Los resultados ya son públicos.");
      }
    };

    return (
      <div className="space-y-6 max-w-4xl">
        <h2 className="text-2xl font-black text-gray-900">Configuración y Cierre del Torneo</h2>
        
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <Icon path={Icons.shield} className="text-[#D4A017]" size={20}/>
            <h3 className="font-bold text-gray-800">Parámetros Principales</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Nombre Oficial</label>
              <input type="text" value={config.torneoNombre} onChange={e=>setConfig({...config, torneoNombre: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Costo Inscripción ($)</label>
              <input type="number" value={config.inscripcion} onChange={e=>setConfig({...config, inscripcion: Number(e.target.value)})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Premio Campeón ($)</label>
              <input type="number" value={config.premio} onChange={e=>setConfig({...config, premio: Number(e.target.value)})} className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <Icon path={Icons.trophy} className="text-[#D4A017]" size={20}/>
            <h3 className="font-bold text-gray-800">Cuadro de Honor (Premios Especiales)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Mejor Jugador</label>
              <input type="text" placeholder="Ej: Luis Torres (Atlético Tigre)" value={config.mejorJugador} onChange={e=>setConfig({...config, mejorJugador: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Mejor Arquero / Valla Invicta</label>
              <input type="text" placeholder="Ej: Carlos Ruiz (FC Águila)" value={config.mejorArquero} onChange={e=>setConfig({...config, mejorArquero: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Mejor Dirigente</label>
              <input type="text" placeholder="Nombre del dirigente destacado" value={config.mejorDirigente} onChange={e=>setConfig({...config, mejorDirigente: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Mejor Barra / Hinchada</label>
              <input type="text" placeholder="Equipo con la mejor afición" value={config.mejorBarra} onChange={e=>setConfig({...config, mejorBarra: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
        </Card>

        <div className="border border-red-200 bg-red-50 p-6 rounded-2xl">
          <h3 className="font-bold text-red-800 mb-2">Clausura del Campeonato</h3>
          <p className="text-sm text-red-600 mb-4">Al dar por terminado el torneo, se congelarán los resultados, no se podrán añadir más partidos y se proclamarán los campeones oficialmente en el portal público de invitados.</p>
          <button 
            onClick={handleCierre}
            disabled={config.estado === "finished"}
            className={`px-6 py-3 rounded-lg text-sm font-black transition-all ${config.estado === "finished" ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30"}`}>
            {config.estado === "finished" ? "TORNEO FINALIZADO" : "🔒 DAR POR TERMINADO EL TORNEO"}
          </button>
        </div>
      </div>
    );
  };

  // MENU LATERAL
  const MENU = [
    { key: "dashboard", label: "Inicio", icon: Icons.home },
    { key: "equipos", label: "Clubes & Finanzas", icon: Icons.dollar },
    { key: "jugadores", label: "Jugadores & Sanciones", icon: Icons.shield },
    { key: "partidos", label: "Calendario & Goles", icon: Icons.calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      
      {/* MENÚ LATERAL PREMIUM (DARK & GOLD) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#141414] text-white flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} border-r border-[#2E2E2E]`}>
        <div className="p-6 border-b border-[#2E2E2E] flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#D4A017] rounded-full flex items-center justify-center text-[#D4A017] font-black text-xl shadow-[0_0_15px_rgba(212,160,23,0.3)] bg-[#1C1C1C]">
            C
          </div>
          <div>
            <p className="font-black text-sm tracking-widest text-white">GAME-LEGAL</p>
            <p className="text-xs text-[#D4A017] font-bold uppercase tracking-widest">Pro Admin</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-2 overflow-y-auto">
          {MENU.map(item => (
            <button key={item.key} onClick={() => { setView(item.key); setSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                view === item.key 
                ? "bg-[#D4A017] text-black shadow-[0_4px_20px_rgba(212,160,23,0.4)]" 
                : "text-[#8A8A8A] hover:bg-[#1C1C1C] hover:text-white"
              }`}>
              <Icon path={item.icon} size={18} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2E2E2E]">
          <button onClick={() => { setView("configuracion"); setSidebarOpen(false); }} className={`w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#D4A017] rounded-lg text-sm font-bold transition-all mb-3 ${view === "configuracion" ? "bg-[#D4A017] text-black" : "text-[#D4A017] hover:bg-[#D4A017] hover:text-black"}`}>
            <Icon path={Icons.trophy} size={16}/> Configurar Torneo
          </button>
          <Link href="/" target="_blank" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1C1C1C] hover:bg-[#242424] rounded-lg text-sm text-white font-bold transition-all border border-[#2E2E2E]">
             <Icon path={Icons.eye} size={16}/> Ver App Pública
          </Link>
        </div>
      </aside>

      {/* OVERLAY PARA MÓVILES */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
            <Icon path={Icons.bars} size={20}/>
          </button>
          <h1 className="font-black text-gray-900 text-lg flex-1 truncate">Administración del Torneo</h1>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-gray-900">Organizador</p>
              <p className="text-xs text-gray-400">Torneo Activo</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#D4A017] to-yellow-300 rounded-full flex items-center justify-center text-black text-sm font-black border-2 border-white shadow">
              GL
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {view === "dashboard" && renderDashboard()}
          {view === "equipos" && renderEquipos()}
          {view === "jugadores" && renderJugadores()}
          {view === "partidos" && renderPartidos()}
          {view === "configuracion" && renderConfiguracion()}
        </div>
      </main>
    </div>
  );
}
