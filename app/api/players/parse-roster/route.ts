import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security";
import { getAccessibleTournament } from "@/lib/tenantAccess";

export const runtime = "nodejs";

function field(text: string, label: string) {
  return text.match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im"))?.[1]?.replace(/_+/g, "").trim() || "";
}

function parseRoster(text: string) {
  const lines = text.replace(/\r/g, "").split("\n").map(line => line.trim()).filter(Boolean);
  const players = lines.flatMap(line => {
    const columns = line.split("\t").map(value => value.trim()).filter(Boolean);
    const match = columns.length >= 4
      ? [columns[0], columns[1], columns[2], columns[3]]
      : line.match(/^(\d{1,2})\s*[|;,-]\s*([A-Za-z0-9-]{6,20})\s*[|;,-]\s*(.{3,}?)\s*[|;,-]\s*(\d{1,2})$/)?.slice(1);
    if (!match || !/^\d{1,2}$/.test(match[0]) || !/^[A-Za-z0-9-]{6,20}$/.test(match[1]) || !/^\d{1,2}$/.test(match[3])) return [];
    return [{ identification: match[1], fullName: match[2].replace(/\s+/g, " ").trim(), jerseyNumber: Number(match[3]) }];
  }).filter(player => player.jerseyNumber >= 1 && player.jerseyNumber <= 99);
  return { teamName: field(text, "EQUIPO"), managerName: field(text, "DIRIGENTE"), managerPhone: field(text, "CELULAR"), players };
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ error: "Configuracion incompleta" }, { status: 500 });
    const supabase = createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll() } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const form = await request.formData();
    const tournamentId = String(form.get("tournament_id") || "");
    const file = form.get("file");
    if (!(file instanceof File) || !tournamentId) return NextResponse.json({ error: "Archivo o torneo invalido" }, { status: 400 });
    if (file.size === 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El archivo debe pesar maximo 5 MB" }, { status: 400 });
    if (!await getAccessibleTournament(supabase, tournamentId, "id")) return NextResponse.json({ error: "No tienes acceso al torneo" }, { status: 403 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.toLowerCase().split(".").pop();
    let text = "";
    if (extension === "docx" && buffer.subarray(0, 2).toString() === "PK") {
      const mammoth: any = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (extension === "pdf" && buffer.subarray(0, 5).toString() === "%PDF-") {
      const pdfParse: any = (await import("pdf-parse")).default;
      text = (await pdfParse(buffer)).text;
    } else return NextResponse.json({ error: "Usa la ficha oficial en formato Word (.docx) o PDF digital" }, { status: 400 });
    const roster = parseRoster(text);
    if (!roster.players.length) return NextResponse.json({ error: "No se encontraron filas validas. Usa la plantilla oficial y completa cedula, nombre y dorsal." }, { status: 422 });
    return NextResponse.json(roster);
  } catch (error) {
    console.error("Error al leer ficha de inscripcion:", error);
    return NextResponse.json({ error: "No se pudo leer el archivo. Verifica que sea una ficha digital, no una imagen escaneada." }, { status: 422 });
  }
}
