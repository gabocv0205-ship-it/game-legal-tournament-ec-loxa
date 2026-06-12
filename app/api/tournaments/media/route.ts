import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rejectCrossOriginRequest } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return NextResponse.json({ error: 'Configuración administrativa incompleta' }, { status: 500 });

    const supabase = createServerClient(supabaseUrl, anonKey, { cookies: { getAll: () => cookieStore.getAll() } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const form = await request.formData();
    const tournamentId = String(form.get('tournament_id') || '');
    const mediaType = String(form.get('media_type') || '');
    const file = form.get('file');
    if (!tournamentId || !['banner', 'poster', 'match-poster'].includes(mediaType) || !(file instanceof File)) return NextResponse.json({ error: 'Solicitud de imagen inválida' }, { status: 400 });
    if (file.type !== 'image/webp' || file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'La imagen debe pesar menos de 4 MB' }, { status: 400 });

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [{ data: tournament }, { data: profile }] = await Promise.all([
      admin.from('tournaments').select('id, user_id').eq('id', tournamentId).single(),
      admin.from('profiles').select('role').eq('id', user.id).single(),
    ]);
    if (!tournament || (tournament.user_id !== user.id && profile?.role !== 'superadmin')) return NextResponse.json({ error: 'No tienes permiso para modificar este torneo' }, { status: 403 });

    const path = `${tournamentId}/${mediaType}-${Date.now()}.webp`;
    const { error } = await admin.storage.from('identidad-torneos').upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: 'image/webp' });
    if (error) throw error;
    return NextResponse.json({ url: admin.storage.from('identidad-torneos').getPublicUrl(path).data.publicUrl });
  } catch (error) {
    console.error('Error al subir identidad del torneo:', error);
    return NextResponse.json({ error: 'No se pudo subir la imagen del torneo' }, { status: 500 });
  }
}
