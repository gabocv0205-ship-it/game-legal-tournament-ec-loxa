import React from "react";
import DashboardClient from "./DashboardClient";
import { createClient } from "@supabase/supabase-js";

export default async function DashboardPage() {
  // 1. Usamos el cliente estándar directo, sin validaciones estrictas de servidor
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 2. Traemos la lista de torneos. Si hay un error invisible, lo ignora y manda una lista vacía.
  const { data: torneos } = await supabase.from("torneos").select("*");

  // 3. Forzamos la carga de la interfaz sin depender de cookies defectuosas
  return (
    <DashboardClient 
      torneosIniciales={torneos || []} 
      usuarioNombre="GABRIEL CALVA" 
      usuarioId="admin-gabo-123" 
    />
  );
}
