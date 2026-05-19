import React from "react";
import DashboardClient from "./DashboardClient";
import { createClient } from "@supabase/supabase-js";

export default async function DashboardPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: torneos } = await supabase.from("torneos").select("*");

  return (
    <DashboardClient 
      torneosIniciales={torneos || []} 
      usuarioNombre="GABRIEL CALVA" 
    />
  );
}
