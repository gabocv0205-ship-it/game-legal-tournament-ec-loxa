import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Returns aggregate metrics within the signed-in user's organization scope. */
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Configuración administrativa incompleta." }, { status: 500 });

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const tournamentsQuery = admin.from("tournaments").select("id, status").neq("status", "deleted");
  const { data: tournaments, error: tournamentsError } = profile?.role === "superadmin"
    ? await tournamentsQuery
    : await tournamentsQuery.eq("user_id", user.id);
  if (tournamentsError) return NextResponse.json({ error: "No se pudo cargar el resumen." }, { status: 500 });

  const tournamentIds = (tournaments || []).map(tournament => tournament.id);
  const activeTournaments = (tournaments || []).filter(tournament => !["finished", "archived"].includes(String(tournament.status))).length;
  if (!tournamentIds.length) return NextResponse.json({ activeTournaments, teams: 0, playedMatches: 0, goals: 0 });

  const [teamsResult, matchesResult] = await Promise.all([
    admin.from("teams").select("id", { count: "exact", head: true }).in("tournament_id", tournamentIds),
    admin.from("matches").select("id, status").in("tournament_id", tournamentIds),
  ]);
  if (teamsResult.error || matchesResult.error) return NextResponse.json({ error: "No se pudo cargar el resumen." }, { status: 500 });

  const finishedMatchIds = (matchesResult.data || []).filter(match => match.status === "finished").map(match => match.id);
  const goalsResult = finishedMatchIds.length
    ? await admin.from("match_events").select("id", { count: "exact", head: true }).in("match_id", finishedMatchIds).eq("event_type", "gol")
    : { count: 0, error: null };
  if (goalsResult.error) return NextResponse.json({ error: "No se pudo cargar el resumen." }, { status: 500 });

  return NextResponse.json({
    activeTournaments,
    teams: teamsResult.count || 0,
    playedMatches: finishedMatchIds.length,
    goals: goalsResult.count || 0,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
