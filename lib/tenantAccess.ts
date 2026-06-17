export async function getAccessibleTournament(supabase: any, tournamentId: string, select = "*") {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id || !tournamentId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  const selection = select.includes("user_id") || select.trim() === "*" ? select : `${select}, user_id`;
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(selection)
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) return null;
  if (profile?.role === "superadmin" || tournament.user_id === session.user.id) return tournament;

  const { data: membership } = await supabase
    .from("tournament_members")
    .select("role")
    .eq("tournament_id", tournamentId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  return membership ? tournament : null;
}

export function clearActiveTournament() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("activeTournamentId");
  localStorage.removeItem("activeTournamentName");
  window.dispatchEvent(new Event("tournamentChanged"));
}
