import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security";

const validRoles = ["admin", "finance", "referee", "viewer"];

async function authorize(tournamentId: string) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return { response: NextResponse.json({ error: "Configuración incompleta" }, { status: 500 }) };

  const supabase = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll() } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };

  const admin = createAdminClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const [{ data: tournament }, { data: profile }, { data: membership }] = await Promise.all([
    admin.from("tournaments").select("id, user_id").eq("id", tournamentId).single(),
    admin.from("profiles").select("role").eq("id", user.id).single(),
    admin.from("tournament_members").select("role").eq("tournament_id", tournamentId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!tournament || (tournament.user_id !== user.id && profile?.role !== "superadmin" && !["owner", "admin"].includes(membership?.role))) {
    return { response: NextResponse.json({ error: "No tienes permiso para administrar roles" }, { status: 403 }) };
  }
  return { admin };
}

export async function GET(request: Request) {
  const tournamentId = new URL(request.url).searchParams.get("tournament_id") || "";
  const auth = await authorize(tournamentId);
  if (auth.response || !auth.admin) return auth.response;
  const { data: memberships, error } = await auth.admin.from("tournament_members").select("*").eq("tournament_id", tournamentId).order("created_at");
  if (error) return NextResponse.json({ error: "Ejecuta production_hardening.sql antes de gestionar roles" }, { status: 500 });
  const ids = (memberships || []).map(member => member.user_id);
  const { data: profiles } = ids.length ? await auth.admin.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const profileById = Object.fromEntries((profiles || []).map(profile => [profile.id, profile]));
  return NextResponse.json({ members: (memberships || []).map(member => ({ ...member, profile: profileById[member.user_id] })) });
}

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  const body = await request.json();
  const tournamentId = String(body.tournament_id || "");
  const role = String(body.role || "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!tournamentId || !email || !validRoles.includes(role)) return NextResponse.json({ error: "Datos de invitación inválidos" }, { status: 400 });
  const auth = await authorize(tournamentId);
  if (auth.response || !auth.admin) return auth.response;
  const { data: profile } = await auth.admin.from("profiles").select("id").eq("email", email).single();
  if (!profile) return NextResponse.json({ error: "El usuario debe tener una cuenta antes de asignarle un rol" }, { status: 404 });
  const { error } = await auth.admin.from("tournament_members").upsert({ tournament_id: tournamentId, user_id: profile.id, role }, { onConflict: "tournament_id,user_id" });
  if (error) return NextResponse.json({ error: "No se pudo asignar el rol. Ejecuta production_hardening.sql" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;
  const body = await request.json();
  const tournamentId = String(body.tournament_id || "");
  const userId = String(body.user_id || "");
  const auth = await authorize(tournamentId);
  if (auth.response || !auth.admin) return auth.response;
  const { error } = await auth.admin.from("tournament_members").delete().eq("tournament_id", tournamentId).eq("user_id", userId);
  if (error) return NextResponse.json({ error: "No se pudo retirar el acceso" }, { status: 500 });
  return NextResponse.json({ success: true });
}
