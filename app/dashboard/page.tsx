import React from "react";
import { createClient } from "../lib/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: torneos } = await supabase.from("torneos").select("*");
  const { data: { user } } = await supabase.auth.getUser();

  const usuarioNombre = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "ORGANIZADOR";
  const usuarioId = user?.id || "anon_id"; // Captura estructural del ID

  return (
    <DashboardClient 
      torneosIniciales={torneos || []} 
      usuarioNombre={usuarioNombre.toUpperCase()} 
      usuarioId={usuarioId} // Transmisión del ID al componente cliente
    />
  );
}
