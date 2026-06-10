import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignorar errores en server components
            }
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'La configuración administrativa de Supabase está incompleta' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: perfil } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (perfil?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const [perfilesRes, pagosRes] = await Promise.all([
      adminSupabase
        .from('profiles')
        .select('*')
        .neq('role', 'superadmin'),
      adminSupabase
        .from('saas_payments')
        .select('*')
        .order('created_at', { ascending: false })
    ]);

    if (perfilesRes.error) throw perfilesRes.error;
    if (pagosRes.error) throw pagosRes.error;

    const profilesById = new Map(perfilesRes.data?.map(perfil => [perfil.id, perfil]) || []);
    const historial = pagosRes.data?.map(pago => ({
      ...pago,
      profiles: profilesById.get(pago.organizer_id)
        ? {
            full_name: profilesById.get(pago.organizer_id)?.full_name,
            email: profilesById.get(pago.organizer_id)?.email,
          }
        : null,
    })) || [];

    let ingresosTotales = 0;
    const clientesProcesados = perfilesRes.data?.map(perfil => {
      const pagosDelCliente = historial.filter(p => p.organizer_id === perfil.id);
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
      historial,
      stats: {
        totalIngresos: ingresosTotales,
        clientesActivos: activos,
        clientesMorosos: morosos,
      }
    });

  } catch (error) {
    console.error('Error en /api/saas/contabilidad:', error);
    return NextResponse.json({ error: 'No se pudo cargar la contabilidad' }, { status: 500 });
  }
}
