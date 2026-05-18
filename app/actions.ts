"use server";
import { createClient } from "./lib/server";
import { revalidatePath } from "next/cache";

// El backend ahora exige recibir el organizadorId de forma directa y segura
export async function registrarTorneoBackend(equipos: number, formato: string, organizadorId: string) {
  const supabase = await createClient();
  const nombreGenerado = `Campeonato Formato ${formato.toUpperCase()} - ${equipos} Equipos`;

  const { error } = await supabase.from("torneos").insert([
    {
      nombre: nombreGenerado,
      estado: "Configuración Inicial",
      organizador_id: organizadorId // Sello de autoría inyectado directamente
    }
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
