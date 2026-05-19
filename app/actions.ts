"use server";
import { revalidatePath } from "next/cache";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Quitamos el parametro de usuarioId para evitar el choque de formatos
export async function registrarTorneoBackend(equipos: number, formato: string) {
  const nombreGenerado = `Campeonato Formato ${formato.toUpperCase()} - ${equipos} Equipos`;

  // Insertamos el torneo directamente, dejando que la BD maneje los IDs sola
  const { error } = await supabase.from("torneos").insert([
    {
      nombre: nombreGenerado,
      estado: "Configuración Inicial"
    }
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
