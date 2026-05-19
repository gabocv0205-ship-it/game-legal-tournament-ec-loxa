"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

// ... (Tus iconos 'Icon' y 'Icons' van aquí, los mismos de antes) ...
// ... (Tus componentes 'Card', 'Badge', 'StatCard', 'Btn' van aquí) ...

export default function TournamentProDashboard() {
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // ESTADOS DE DATOS
  const [equipos, setEquipos] = useState<any[]>([]);
  // ... (tus otros estados: jugadores, partidos) ...

  // NUEVO ESTADO: Configuración del Torneo
  const [config, setConfig] = useState({
    nombre: "Champions GAME-LEGAL 2026",
    estado: "active", // active, finished
    inscripcion: 200,
    premioMayor: "$1,500",
    premios: {
      mejorJugador: "",
      mejorArquero: "",
      mejorDirigente: "",
      mejorBarra: ""
    }
  });

  // --- NUEVA VISTA: CONFIGURACIÓN DEL TORNEO ---
  const renderConfiguracion = () => (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900">Ajustes del Campeonato</h2>
        {config.estado === 'active' ? (
          <Btn variant="danger" onClick={() => {
            if(confirm("¿Estás seguro de FINALIZAR el torneo? Esto congelará las tablas.")) {
              setConfig({...config, estado: 'finished'});
            }
          }}>🛑 Finalizar Torneo</Btn>
        ) : (
          <Badge label="🏆 TORNEO FINALIZADO" color="green" />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Datos Principales */}
        <Card className="p-6">
          <h3 className="font-bold mb-4 text-blue-900 border-b pb-2">Datos Generales</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500">Nombre Oficial del Torneo</label>
              <input type="text" value={config.nombre} onChange={e=>setConfig({...config, nombre: e.target.value})} className="w-full p-2 border rounded-xl bg-gray-50 font-bold" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500">Valor Inscripción ($)</label>
                <input type="number" value={config.inscripcion} onChange={e=>setConfig({...config, inscripcion: Number(e.target.value)})} className="w-full p-2 border rounded-xl bg-gray-50" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500">Premio Mayor</label>
                <input type="text" value={config.premioMayor} onChange={e=>setConfig({...config, premioMayor: e.target.value})} className="w-full p-2 border rounded-xl bg-gray-50" />
              </div>
            </div>
          </div>
        </Card>

        {/* Premios Especiales */}
        <Card className="p-6">
          <h3 className="font-bold mb-4 text-amber-600 border-b pb-2">Gala de Premiación Especial</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500">⭐ Mejor Jugador (MVP)</label>
              <input type="text" placeholder="Ej. Luis Torres (Atlético)" value={config.premios.mejorJugador} onChange={e=>setConfig({...config, premios: {...config.premios, mejorJugador: e.target.value}})} className="w-full p-2 border border-amber-200 rounded-xl bg-amber-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">🧤 Mejor Arquero</label>
              <input type="text" placeholder="Ej. Carlos Ruiz (FC Aguila)" value={config.premios.mejorArquero} onChange={e=>setConfig({...config, premios: {...config.premios, mejorArquero: e.target.value}})} className="w-full p-2 border border-blue-200 rounded-xl bg-blue-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">👔 Mejor Dirigente</label>
              <input type="text" placeholder="Nombre del dirigente" value={config.premios.mejorDirigente} onChange={e=>setConfig({...config, premios: {...config.premios, mejorDirigente: e.target.value}})} className="w-full p-2 border border-purple-200 rounded-xl bg-purple-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">🥁 Mejor Barra / Hinchada</label>
              <input type="text" placeholder="Ej. La Sur Oscura Lojana" value={config.premios.mejorBarra} onChange={e=>setConfig({...config, premios: {...config.premios, mejorBarra: e.target.value}})} className="w-full p-2 border border-green-200 rounded-xl bg-green-50" />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Btn onClick={() => alert("Configuración guardada y publicada en la web principal.")}>💾 Guardar Cambios</Btn>
      </div>
    </div>
  );

  // ... (Tus otros renderDashboard, renderEquipos, etc.) ...

  // MENÚ CON LA NUEVA OPCIÓN
  const MENU = [
    { key: "dashboard", label: "Inicio", icon: Icons.home },
    { key: "equipos", label: "Clubes & Finanzas", icon: Icons.dollar },
    { key: "jugadores", label: "Jugadores & Sanciones", icon: Icons.shield },
    { key: "partidos", label: "Calendario & Goles", icon: Icons.calendar },
    { key: "configuracion", label: "Ajustes del Torneo", icon: Icons.trophy }, // NUEVO
  ];

  // SOLUCIÓN AL SOLAPAMIENTO DEL MENÚ (Flexbox estricto)
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Menú Lateral Premium (Dark & Gold) */}
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

  {/* Botón añadido para ir a Configuración de Torneo */}
  <div className="p-4 border-t border-[#2E2E2E]">
    <button onClick={() => { setView("configuracion"); setSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#D4A017] rounded-lg text-sm text-[#D4A017] font-bold hover:bg-[#D4A017] hover:text-black transition-all mb-3">
      <Icon path={Icons.trophy} size={16}/> Configurar Torneo
    </button>
    <Link href="/" target="_blank" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1C1C1C] hover:bg-[#242424] rounded-lg text-sm text-white font-bold transition-all border border-[#2E2E2E]">
       <Icon path={Icons.eye} size={16}/> Ver Portal Público
    </Link>
  </div>
</aside>

      {/* CONTENIDO PRINCIPAL: Toma el resto del espacio (flex-1), con scroll interno */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-gray-100 rounded-xl">Menú</button>
          <h1 className="font-black text-gray-900 text-lg flex-1">{config.nombre}</h1>
        </header>

        <div className="p-4 md:p-8">
          {view === "dashboard" && <div>{/* Render Dashboard */}</div>}
          {view === "configuracion" && renderConfiguracion()}
          {/* Llama a tus otras vistas aquí */}
        </div>
      </main>

    </div>
  );
}
