"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Shield, Calendar, DollarSign, Settings, User, Sparkles, Layers, Loader2 } from "lucide-react";
import { registrarTorneoBackend } from "../actions"; 

interface Torneo {
  id: number;
  nombre: string;
  estado: string;
}

interface DashboardClientProps {
  torneosIniciales: Torneo[];
  usuarioNombre: string;
}

export default function DashboardClient({ torneosIniciales, usuarioNombre }: DashboardClientProps) {
  const [numEquipos, setNumEquipos] = useState<string>("");
  const [formatoSeleccionado, setFormatoSeleccionado] = useState<string>("");
  const [recomendacion, setRecomendacion] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const equipos = parseInt(numEquipos);
    if (!equipos || equipos <= 0) {
      setRecomendacion("");
      return;
    }

    if (equipos === 32) {
      setRecomendacion("Fase de grupos con 32 equipos (8 grupos de 4 - Formato Mundial)");
      setFormatoSeleccionado("grupos-32");
    } else if (equipos === 5) {
      setRecomendacion("Fase de grupos con 5 equipos (Todos contra todos - 1 libre por fecha)");
      setFormatoSeleccionado("grupos-5");
    } else if (equipos === 6) {
      setRecomendacion("Fase de grupos con 6 equipos (2 grupos de 3 o todos contra todos)");
      setFormatoSeleccionado("grupos-6");
    } else {
      setRecomendacion("Formato tipo liguilla (Todos contra todos - Ideal para ligas regulares)");
      setFormatoSeleccionado("liguilla");
    }
  }, [numEquipos]);

  const procesarCreacionTorneo = async () => {
    if (!numEquipos || !formatoSeleccionado) {
      alert("Por favor, ingresa el número de equipos para seleccionar un formato.");
      return;
    }

    setIsSubmitting(true);
    
    // Llamamos al backend SIN enviar el ID problemático
    const result = await registrarTorneoBackend(parseInt(numEquipos), formatoSeleccionado);
    
    if (result.success) {
      setNumEquipos(""); 
      setFormatoSeleccionado("");
    } else {
      alert("Ocurrió un error: " + result.error);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 fixed w-full z-30 top-0 left-0 h-16 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">🏆</div>
          <span className="font-black text-lg tracking-tighter text-gray-900">GAME-LEGAL</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
          <User size={16} className="text-blue-600" />
          <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">
            Cliente: {usuarioNombre}
          </span>
        </div>
      </nav>

      <div className="pt-24 px-8 max-w-7xl mx-auto pb-12">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Panel de Control</h1>
          <p className="text-slate-500 font-medium text-sm">Configuración arquitectónica y gestión de formatos.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-blue-600" /> Asistente de Formato Automatizado
              </h2>
              
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                  Número Total de Equipos Participantes
                </label>
                <input
                  type="number"
                  placeholder="Ej. 32, 5, 6..."
                  value={numEquipos}
                  onChange={(e) => setNumEquipos(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 transition-colors font-medium"
                />
              </div>

              {recomendacion && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                  <div className="text-xl">🤖</div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Sugerencia del Sistema</h4>
                    <p className="text-sm font-semibold text-blue-900 mt-0.5">{recomendacion}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-3">
                  Estructura del Campeonato Seleccionada
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormatoSeleccionado("grupos-32")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formatoSeleccionado === "grupos-32" ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold text-gray-900 text-sm">Fase de grupos con 32 equipos</div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">8 llaves de 4 escuadras con eliminación directa.</div>
                  </button>

                  <button
                    onClick={() => setFormatoSeleccionado("grupos-5")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formatoSeleccionado === "grupos-5" ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold text-gray-900 text-sm">Fase de grupos con 5 equipos</div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">Todos contra todos, un club descansa por jornada.</div>
                  </button>

                  <button
                    onClick={() => setFormatoSeleccionado("grupos-6")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formatoSeleccionado === "grupos-6" ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold text-gray-900 text-sm">Fase de grupos con 6 equipos</div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">Dos grupos de tres o una etapa única de todos contra todos.</div>
                  </button>

                  <button
                    onClick={() => setFormatoSeleccionado("liguilla")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formatoSeleccionado === "liguilla" ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-bold text-gray-900 text-sm">Formato tipo liguilla</div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">Tabla general acumulada por puntos ida y vuelta.</div>
                  </button>
                </div>
              </div>

              <button 
                onClick={procesarCreacionTorneo}
                disabled={isSubmitting}
                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-md shadow-blue-600/10 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                {isSubmitting ? "Persistiendo en Base de Datos..." : "Confirmar y Configurar Fixture"}
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Layers size={20} className="text-slate-700" /> Campeonatos en Producción
              </h2>
              {torneosIniciales.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-400 text-sm font-medium">No se detectan torneos activos en base de datos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {torneosIniciales.map((t) => (
                    <Link href={`/equipos?torneoId=${t.id}`} key={t.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{t.nombre}</div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium">Estado: {t.estado}</div>
                        </div>
                        <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded-md">Activo</span>
                      </div>
                      <button className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        Administrar Torneo
                      </button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Herramientas Globales</h3>
            
            <Link href="/equipos" className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">🛡️</div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Módulo de Equipos</h4>
                <p className="text-slate-500 text-xs font-medium mt-0.5">Control de plantillas y fichajes</p>
              </div>
            </Link>

            <Link href="/finanzas" className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">💰</div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Módulo Financiero</h4>
                <p className="text-slate-500 text-xs font-medium mt-0.5">Inscripciones y arbitrajes</p>
              </div>
            </Link>

            <Link href="/calendario" className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">📅</div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Calendario Automático</h4>
                <p className="text-slate-500 text-xs font-medium mt-0.5">Generación de fixtures y fechas</p>
              </div>
            </Link>

            <Link href="/configuracion" className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-105 transition-transform">⚙️</div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Ajustes del Sistema</h4>
                <p className="text-slate-500 text-xs font-medium mt-0.5">Parámetros del reglamento legal</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
