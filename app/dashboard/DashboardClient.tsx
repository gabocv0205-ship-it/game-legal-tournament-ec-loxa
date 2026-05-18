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

// 1. Agregamos el usuarioId a las propiedades obligatorias
interface DashboardClientProps {
  torneosIniciales: Torneo[];
  usuarioNombre: string;
  usuarioId: string; 
}

// 2. Recibimos el usuarioId
export default function DashboardClient({ torneosIniciales, usuarioNombre, usuarioId }: DashboardClientProps) {
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
    
    // 3. Ejecutamos la acción inyectando los 3 datos requeridos, incluyendo tu ID
    const result = await registrarTorneoBackend(parseInt(numEquipos), formatoSeleccionado, usuarioId);
    
    if (result.success) {
      setNumEquipos(""); 
      setFormatoSeleccionado("");
    } else {
      alert("Error crítico del sistema: " + result.error);
    }
    
    setIsSubmitting(false);
  };

  // ... (El resto del código del return (<div className="min-h-screen... queda exactamente igual)
