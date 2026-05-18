"use server";

import { createClient } from "./lib/server";
import { revalidatePath } from "next/cache";

export async function registrarTorneoBackend(equipos: number, formato: string) {
  const supabase = await createClient();
  
  // Generamos un nombre dinámico basado en los datos si el usuario no lo provee
  const nombreGenerado = `Campeonato Formato ${formato.toUpperCase()} - ${equipos} Equipos`;

  // Persistencia de datos en la tabla 'torneos'
  const { data, error } = await supabase.from("torneos").insert([
    {
      nombre: nombreGenerado,
      estado: "Configuración Inicial",
    }
  ]);

  if (error) {
    console.error("Error al persistir torneo:", error);
    return { success: false, error: error.message };
  }

  // Revalidamos la ruta para que la lista de la pantalla se actualice al instante sin recargar
  revalidatePath("/dashboard");
  return { success: true };
}
