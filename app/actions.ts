"use server";

import { createClient } from "./lib/server";
import { revalidatePath } from "next/cache";

export async function registrarTorneoBackend(equipos: number, formato: string) {
  const supabase = await createClient();
  
  // 1. Extraemos la credencial del usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Usuario no autenticado o sesión expirada." };
  }

  const nombreGenerado = `Campeonato Formato ${formato.toUpperCase()} - ${equipos} Equipos`;

  // 2. Persistencia enviando explícitamente el organizador_id
  const { data, error } = await supabase.from("torneos").insert([
    {
      nombre: nombreGenerado,
      estado: "Configuración Inicial",
      organizador_id: user.id // <- Esta firma autoriza la transacción en la base de datos
    }
  ]);

  if (error) {
    console.error("Error al persistir torneo:", error);
    return { success: false, error: error.message };
  }

  // 3. Actualizamos la interfaz
  revalidatePath("/dashboard");
  return { success: true };
}
