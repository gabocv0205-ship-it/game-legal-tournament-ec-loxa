// 📄 app/api/saas/cobrar/route.ts
// Registra un pago y reactiva la cuenta del cliente

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Configurar cliente admin (mismo patrón que clients/route.ts)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseAdminKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Verificar sesión
    const { data: { user } } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 3. Verificar rol
    const { data: perfil } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (perfil?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Solo superadmin puede cobrar' }, { status: 403 });
    }

    // 4. Leer datos del pago enviados desde el frontend
    const body = await request.json();
    const { organizer_id, amount, concept, notes } = body;

    if (!organizer_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // 5. Insertar el pago en saas_payments
    const { error: pagoError } = await supabaseAdmin
      .from('saas_payments')
      .insert([{
        organizer_id,
        amount: Number(amount),
        concept,
        notes,
        collected_by: user.id, // Quién cobró
      }]);

    if (pagoError) throw pagoError;

    // 6. Reactivar la cuenta del cliente
    const { error: perfilError } = await supabaseAdmin
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
