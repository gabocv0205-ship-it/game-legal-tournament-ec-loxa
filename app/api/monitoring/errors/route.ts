import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security";

export async function POST(request: Request) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });

  const supabase = createServerClient(url, anonKey, { cookies: { getAll: () => cookieStore.getAll() } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const message = String(body.message || "").slice(0, 1000);
  if (!message) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.from("app_error_log").insert({
    user_id: user.id,
    path: String(body.path || "").slice(0, 300),
    message,
    digest: String(body.digest || "").slice(0, 200) || null,
    metadata: { userAgent: request.headers.get("user-agent") },
  });
  if (error) return NextResponse.json({ error: "No se pudo registrar el incidente" }, { status: 500 });
  return NextResponse.json({ success: true });
}
