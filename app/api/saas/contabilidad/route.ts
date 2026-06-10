import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // 1. Crear cliente con cookies (lee la sesión del navegador)
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

    // 2. Verificar sesión del usuario logueado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 3. Verificar que sea superadmin
    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (perfil?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // 4. Usar admin client para leer datos
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const [perfilesRes, pagosRes] = await Promise.all([
      adminSupabase
        .from('profiles')
        .select('*')
        .neq('role', 'superadmin'),
      adminSupabase
        .from('saas_payments')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
    ]);

    if (perfilesRes.error) throw perfilesRes.error;
    if (pagosRes.error) throw pagosRes.error;

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
