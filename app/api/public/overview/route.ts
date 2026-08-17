import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Public aggregate only: it never returns private teams, players or financial data. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Configuración pública incompleta." }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: tournaments, error: tournamentError } = await admin
    .from("tournaments")
    .select("id")
    .not("status", "in", "(finished,archived,deleted)");
  if (tournamentError) return NextResponse.json({ error: "No se pudieron calcular las métricas." }, { status: 500 });

  const tournamentIds = (tournaments || []).map(tournament => tournament.id);
  if (!tournamentIds.length) {
    return NextResponse.json({ activeTournaments: 0, registeredTeams: 0, playedMatches: 0, goals: 0 }, { headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=90" } });
  }

  const [teamsResult, matchesResult] = await Promise.all([
    admin.from("teams").select("id", { count: "exact", head: true }).in("tournament_id", tournamentIds),
    admin.from("matches").select("id, status").in("tournament_id", tournamentIds),
  ]);
  if (teamsResult.error || matchesResult.error) return NextResponse.json({ error: "No se pudieron calcular las métricas." }, { status: 500 });

  const finishedMatchIds = (matchesResult.data || []).filter(match => match.status === "finished").map(match => match.id);
  const goalsResult = finishedMatchIds.length
    ? await admin.from("match_events").select("id", { count: "exact", head: true }).in("match_id", finishedMatchIds).eq("event_type", "gol")
    : { count: 0, error: null };
  if (goalsResult.error) return NextResponse.json({ error: "No se pudieron calcular las métricas." }, { status: 500 });

  return NextResponse.json({
    activeTournaments: tournamentIds.length,
    registeredTeams: teamsResult.count || 0,
    playedMatches: finishedMatchIds.length,
    goals: goalsResult.count || 0,
  }, { headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=90" } });
}
