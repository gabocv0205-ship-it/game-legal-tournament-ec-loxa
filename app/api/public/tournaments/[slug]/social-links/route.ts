import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const EMPTY_SOCIAL_LINKS = {
  full_name: null,
  facebook_url: null,
  instagram_url: null,
  whatsapp_url: null,
  tiktok_url: null,
  youtube_url: null,
  website_url: null,
  other_social_url: null,
};

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await context.params;
  const slug = rawSlug.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!slug || slug.length > 160) {
    return NextResponse.json({ error: "Torneo no valido" }, { status: 400 });
  }

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Configuracion incompleta" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: tournament, error: tournamentError } = await admin
    .from("tournaments")
    .select("user_id")
    .eq("slug", slug)
    .neq("status", "deleted")
    .maybeSingle();

  if (tournamentError) {
    console.error("No se pudo consultar el torneo para sus enlaces publicos", tournamentError);
    return NextResponse.json({ error: "No se pudo consultar el torneo" }, { status: 500 });
  }

  if (!tournament?.user_id) {
    return NextResponse.json({ socialLinks: EMPTY_SOCIAL_LINKS }, { status: 404 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name, facebook_url, instagram_url, whatsapp_url, tiktok_url, youtube_url, website_url, other_social_url")
    .eq("id", tournament.user_id)
    .maybeSingle();

  if (profileError) {
    console.error("No se pudieron consultar los enlaces publicos del organizador", profileError);
    return NextResponse.json({ error: "No se pudieron consultar los enlaces" }, { status: 500 });
  }

  return NextResponse.json(
    { socialLinks: profile || EMPTY_SOCIAL_LINKS },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
