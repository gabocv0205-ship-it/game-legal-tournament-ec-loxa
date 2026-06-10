import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Crear cliente con cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    // 2. Verificar sesión
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 3. Verificar rol
    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (perfil?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Solo superadmin puede cobrar' }, { status: 403 });
    }

    // 4. Leer datos del pago
    const body = await request.json();
    const { organizer_id, amount, concept, notes } = body;

    if (!organizer_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // 5. Usar admin client para escribir
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const { error: pagoError } = await adminSupabase
      .from('saas_payments')
      .insert([{
        organizer_id,
        amount: Number(amount),
        concept,
        notes,
        collected_by: user.id,
      }]);

    if (pagoError) throw pagoError;

    const { error: perfilError } = await adminSupabase
      .from('profiles')
      .update({ saas_status: 'active' })
      .eq('id', organizer_id);

    if (perfilError) throw perfilError;

    return NextResponse.json({
      success: true,
      message: 'Pago asentado y cuenta reactivada'
    });

  } catch (error: any) {
    console.error('Error en /api/saas/cobrar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
