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
// Motor de autenticación desde el servidor (Sella las cookies correctamente)
export async function loginBackend(email: string, password: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
