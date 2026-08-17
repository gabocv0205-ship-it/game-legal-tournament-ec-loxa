import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security";

/** Archives a tournament without deleting its sporting and financial history. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Torneo no especificado." }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Debes iniciar sesión para archivar un torneo." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "La configuración administrativa no está disponible." }, { status: 500 });

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const [{ data: tournament, error: tournamentError }, { data: profile }] = await Promise.all([
    admin.from("tournaments").select("id, name, user_id, status").eq("id", id).maybeSingle(),
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  if (tournamentError) return NextResponse.json({ error: "No se pudo validar el torneo." }, { status: 500 });
  if (!tournament) return NextResponse.json({ error: "El torneo no existe o ya fue archivado." }, { status: 404 });
  if (tournament.user_id !== user.id && profile?.role !== "superadmin") {
    return NextResponse.json({ error: "No tienes permiso para archivar este torneo." }, { status: 403 });
  }
  if (tournament.status === "deleted") {
    return NextResponse.json({ error: "El torneo ya estaba archivado." }, { status: 409 });
  }

  const { data: archived, error: archiveError } = await admin
    .from("tournaments")
    .update({ status: "deleted" })
    .eq("id", id)
    .select("id, name, status")
    .single();

  if (archiveError) {
    console.error("Unable to archive tournament", archiveError);
    return NextResponse.json({ error: "No se pudo archivar el torneo. No se modificó ningún dato deportivo." }, { status: 500 });
  }

  return NextResponse.json({ tournament: archived, message: "Torneo archivado correctamente. Su historial se conserva." });
}
