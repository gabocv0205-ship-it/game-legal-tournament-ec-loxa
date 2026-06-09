// 📄 app/api/saas/contabilidad/route.ts
// Mismo patrón que tu app/api/clients/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Verificar quién está pidiendo los datos
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseAdminKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.");
    }

    // Cliente con permisos de admin (igual que tu clients/route.ts)
    const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Verificar sesión del usuario actual
    const { data: { user } } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 3. Verificar que sea superadmin
    const { data: perfil } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (perfil?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado. Solo superadmin.' }, { status: 403 });
    }

    // 4. Cargar datos (en paralelo = más rápido)
    const [perfilesRes, pagosRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .neq('role', 'superadmin'),
      supabaseAdmin
        .from('saas_payments')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
    ]);

    if (perfilesRes.error) throw perfilesRes.error;
    if (pagosRes.error) throw pagosRes.error;

    // 5. Calcular estadísticas
    let ingresosTotales = 0;
    const clientesProcesados = perfilesRes.data?.map(perfil => {
      const pagosDelCliente = pagosRes.data?.filter(p => p.organizer_id === perfil.id) || [];
      const totalPagado = pagosDelCliente.reduce((sum, p) => sum + Number(p.amount), 0);
      ingresosTotales += totalPagado;
      return { ...perfil, totalPagado };
    }) || [];

    const activos = clientesProcesados.filter(c => c.saas_status === 'active').length;
    const morosos = clientesProcesados.filter(
      c => c.saas_status === 'pending_payment' || c.saas_status === 'suspended'
    ).length;

    // 6. Devolver resultado
    return NextResponse.json({
      clientes: clientesProcesados,
      historial: pagosRes.data || [],
      stats: {
        totalIngresos: ingresosTotales,
        clientesActivos: activos,
        clientesMorosos: morosos,
      }
    });

  } catch (error: any) {
    console.error('Error en /api/saas/contabilidad:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
