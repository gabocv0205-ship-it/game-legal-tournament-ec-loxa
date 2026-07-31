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

    const [perfilesRes, pagosRes, facturasRes, pagosFacturasRes] = await Promise.all([
      adminSupabase
        .from('profiles')
        .select('*')
        .neq('role', 'superadmin'),
      adminSupabase
        .from('saas_payments')
        .select('*')
        .order('created_at', { ascending: false })
        ,
      adminSupabase
        .from('saas_invoices')
        .select('*')
        .order('created_at', { ascending: false }),
      adminSupabase
        .from('saas_invoice_payments')
        .select('*')
        .order('paid_at', { ascending: false })
    ]);

    if (perfilesRes.error) throw perfilesRes.error;
    if (pagosRes.error) throw pagosRes.error;
    if (facturasRes.error) throw facturasRes.error;
    if (pagosFacturasRes.error) throw pagosFacturasRes.error;

    const profilesById = new Map(perfilesRes.data?.map(perfil => [perfil.id, perfil]) || []);
    const facturas = facturasRes.data || [];
    const pagosFacturas = pagosFacturasRes.data || [];
    const historialLegado = pagosRes.data?.map(pago => ({
      ...pago,
      source: 'legacy',
      profiles: profilesById.get(pago.organizer_id)
        ? {
            full_name: profilesById.get(pago.organizer_id)?.full_name,
            email: profilesById.get(pago.organizer_id)?.email,
          }
        : null,
      })) || [];
    const facturasById = new Map(facturas.map(factura => [factura.id, factura]));
    const historialFacturas = pagosFacturas.map(pago => ({
      ...pago,
      created_at: pago.paid_at,
      concept: facturasById.get(pago.invoice_id)?.concept || 'Pago de factura SaaS',
      source: 'invoice',
      invoice_id: pago.invoice_id,
      profiles: profilesById.get(pago.organizer_id)
        ? { full_name: profilesById.get(pago.organizer_id)?.full_name, email: profilesById.get(pago.organizer_id)?.email }
        : null,
    }));
    const historial = [...historialLegado, ...historialFacturas]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    let ingresosTotales = 0;
    const clientesProcesados = perfilesRes.data?.map(perfil => {
      const pagosDelCliente = historial.filter(p => p.organizer_id === perfil.id);
      const facturasDelCliente = facturas
        .filter(factura => factura.organizer_id === perfil.id)
        .map(factura => {
          const paidAmount = pagosFacturas
            .filter(pago => pago.invoice_id === factura.id)
            .reduce((sum, pago) => sum + Number(pago.amount || 0), 0);
          return { ...factura, paidAmount, balance: Math.max(0, Number(factura.amount || 0) - paidAmount) };
        });
      const totalPagado = pagosDelCliente.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalFacturado = facturasDelCliente.reduce((sum, factura) => sum + Number(factura.amount || 0), 0);
      const saldoPendiente = facturasDelCliente.reduce((sum, factura) => sum + Number(factura.balance || 0), 0);
      const today = new Date().toISOString().slice(0, 10);
      const facturaVencida = facturasDelCliente.some(factura => factura.balance > 0 && (factura.status === 'overdue' || (factura.due_date && factura.due_date < today)));
      const facturacionStatus = facturasDelCliente.length === 0
        ? (perfil.saas_status === 'active' ? 'active' : 'pending')
        : saldoPendiente === 0 ? 'paid' : facturaVencida ? 'overdue' : pagosDelCliente.some(p => p.source === 'invoice') ? 'partial' : 'pending';
      ingresosTotales += totalPagado;
      return { ...perfil, totalPagado, totalFacturado, saldoPendiente, facturacionStatus, facturas: facturasDelCliente };
    }) || [];

    const activos = clientesProcesados.filter(c => c.facturacionStatus === 'paid' || (c.facturacionStatus === 'active' && c.saldoPendiente === 0)).length;
    const morosos = clientesProcesados.filter(
      c => c.facturacionStatus === 'overdue' || c.facturacionStatus === 'pending' || c.saas_status === 'suspended'
    ).length;

    return NextResponse.json({
      clientes: clientesProcesados,
      historial,
      facturas,
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
