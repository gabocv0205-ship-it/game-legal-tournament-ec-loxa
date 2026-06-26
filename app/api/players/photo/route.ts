import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;

    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Configuracion administrativa incompleta" }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, anonKey, { cookies: { getAll: () => cookieStore.getAll() } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const form = await request.formData();
    const playerId = String(form.get("player_id") || "");
    const file = form.get("file");
    if (!playerId || !(file instanceof File)) {
      return NextResponse.json({ error: "Solicitud de foto invalida" }, { status: 400 });
    }
    if (file.type !== "image/webp" || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "La foto debe estar optimizada en WEBP y pesar menos de 2 MB" }, { status: 400 });
    }

    const { data: player } = await supabase
      .from("players")
      .select("id, tournament_id, photo_url")
      .eq("id", playerId)
      .single();
    if (!player) return NextResponse.json({ error: "No tienes permiso para modificar este jugador" }, { status: 403 });

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const path = `${player.tournament_id}/${player.id}/photo-${Date.now()}.webp`;
    const { error: uploadError } = await admin.storage
      .from("player-assets")
      .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: "image/webp", upsert: false });
    if (uploadError) throw uploadError;

    const publicUrl = admin.storage.from("player-assets").getPublicUrl(path).data.publicUrl;
    const { error: updateError } = await admin.from("players").update({ photo_url: publicUrl }).eq("id", player.id);
    if (updateError) throw updateError;

    const oldPath = player.photo_url?.split("/player-assets/")[1];
    if (oldPath) await admin.storage.from("player-assets").remove([oldPath]);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Error al subir foto del jugador:", error);
    return NextResponse.json({ error: "No se pudo subir la foto del jugador" }, { status: 500 });
  }
}
