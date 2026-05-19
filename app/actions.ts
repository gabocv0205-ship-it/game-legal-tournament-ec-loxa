"use server";
import { revalidatePath } from "next/cache";
import { createClient } from '@supabase/supabase-js';

// Usamos una conexión directa y pura, sin cookies que traben el proceso
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function registrarTorneoBackend(equipos: number, formato: string, usuarioId: string) {
  const nombreGenerado = `Campeonato Formato ${formato.toUpperCase()} - ${equipos} Equipos`;

  // Insertamos directo en la base de datos
  const { error } = await supabase.from("torneos").insert([
    {
      nombre: nombreGenerado,
      estado: "Configuración Inicial",
      organizador_id: usuarioId
    }
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  // Refrescamos la pantalla para que aparezca el torneo
  revalidatePath("/dashboard");
  return { success: true };
}
