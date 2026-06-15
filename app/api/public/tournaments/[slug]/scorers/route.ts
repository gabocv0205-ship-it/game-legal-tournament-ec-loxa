import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Configuracion incompleta" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: tournament } = await admin
    .from("tournaments")
    .select("id")
    .eq("slug", slug)
    .neq("status", "deleted")
    .maybeSingle();

  if (!tournament) return NextResponse.json({ scorers: [] });

  const { data: matches } = await admin.from("matches").select("id").eq("tournament_id", tournament.id);
  const matchIds = (matches || []).map(match => match.id);
  if (!matchIds.length) return NextResponse.json({ scorers: [] });

  const { data: events } = await admin
    .from("match_events")
    .select("player_id, team_id")
    .in("match_id", matchIds)
    .eq("event_type", "gol");

  const playerIds = [...new Set((events || []).map(event => event.player_id).filter(Boolean))];
  const teamIds = [...new Set((events || []).map(event => event.team_id).filter(Boolean))];
  const [{ data: players }, { data: teams }] = await Promise.all([
    playerIds.length ? admin.from("players").select("id, full_name").in("id", playerIds) : { data: [] },
    teamIds.length ? admin.from("teams").select("id, name").in("id", teamIds) : { data: [] },
  ]);

  const playerById = Object.fromEntries((players || []).map(player => [player.id, player.full_name]));
  const teamById = Object.fromEntries((teams || []).map(team => [team.id, team.name]));
  const totals: Record<string, { id: string; name: string; team: string; goles: number }> = {};

  (events || []).forEach(event => {
    if (!event.player_id) return;
    totals[event.player_id] ||= {
      id: event.player_id,
      name: playerById[event.player_id] || "Jugador",
      team: teamById[event.team_id] || "Equipo",
      goles: 0,
    };
    totals[event.player_id].goles++;
  });

  return NextResponse.json({
    scorers: Object.values(totals).sort((a, b) => b.goles - a.goles || a.name.localeCompare(b.name)).slice(0, 10),
  });
}
