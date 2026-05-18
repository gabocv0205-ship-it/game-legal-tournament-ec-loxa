import React from "react";
import { createClient } from "../lib/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  // 1. Instanciamos la conexión segura del lado del servidor
  const supabase = await createClient();

  // 2. Extraemos los torneos vigentes en la base de datos
  const { data: torneos } = await supabase.from("torneos").select("*");

  // 3. Consultamos los metadatos del usuario autenticado en sesión
  const { data: { user } } = await supabase.auth.getUser();

  // Resolución del nombre dinámico del cliente (prioriza metadatos, email, o fallback técnico)
  const usuarioNombre = 
    user?.user_metadata?.full_name || 
    user?.email?.split("@")[0] || 
    "GABRIEL CALVA";

  // Retornamos el componente de cliente inyectándole los datos desde el servidor
  return (
    <DashboardClient 
      torneosIniciales={torneos || []} 
      usuarioNombre={usuarioNombre.toUpperCase()} 
    />
  );
}
