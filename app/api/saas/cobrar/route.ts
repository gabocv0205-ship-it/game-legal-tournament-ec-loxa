import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { rejectCrossOriginRequest } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'La configuración administrativa de Supabase está incompleta' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 3. Verificar rol sin depender de las políticas RLS del navegador
    const { data: perfil } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (perfil?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Solo superadmin puede cobrar' }, { status: 403 });
    }

    // 4. Leer datos del pago
    const body = await request.json();
    const { organizer_id, invoice_id, amount, concept, notes, payment_method } = body;
    const numericAmount = Number(amount);

    if (!organizer_id || !Number.isFinite(numericAmount) || numericAmount <= 0 || !concept?.trim()) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: organizer, error: organizerError } = await adminSupabase
      .from('profiles')
      .select('id, role')
      .eq('id', organizer_id)
      .single();

    if (organizerError || !organizer || organizer.role === 'superadmin') {
      return NextResponse.json({ error: 'Cliente SaaS inválido' }, { status: 400 });
    }

    if (invoice_id) {
      const { data: invoice, error: invoiceError } = await adminSupabase
        .from('saas_invoices')
        .select('id, organizer_id, concept, amount, status')
        .eq('id', invoice_id)
        .eq('organizer_id', organizer_id)
        .single();

      if (invoiceError || !invoice) {
        return NextResponse.json({ error: 'La factura SaaS no existe o no pertenece al cliente' }, { status: 400 });
      }

      const { data: invoicePayment, error: paymentError } = await adminSupabase.rpc('record_saas_invoice_payment', {
        p_invoice_id: invoice_id,
        p_amount: numericAmount,
        p_payment_method: String(payment_method || 'transferencia'),
        p_notes: notes?.trim() || null,
        p_collected_by: user.id,
      });

      if (paymentError) throw paymentError;

      const { data: refreshedInvoice, error: refreshedInvoiceError } = await adminSupabase
        .from('saas_invoices')
        .select('status')
        .eq('id', invoice_id)
        .single();
      if (refreshedInvoiceError) throw refreshedInvoiceError;

      const { error: profileError } = await adminSupabase
        .from('profiles')
        .update({ saas_status: refreshedInvoice.status === 'paid' ? 'active' : 'pending_payment' })
        .eq('id', organizer_id);
      if (profileError) throw profileError;

      await adminSupabase.from('admin_activity_log').insert({
        actor_id: user.id,
        target_id: organizer_id,
        action: 'saas_invoice_payment_recorded',
        details: { invoice_id, amount: numericAmount, payment_id: invoicePayment?.id || null },
      });

      return NextResponse.json({ success: true, message: 'Pago registrado en la factura SaaS', invoice_status: refreshedInvoice.status });
    }

    // Compatibilidad: conserva el flujo historico para clientes sin factura.
    const { data: pago, error: pagoError } = await adminSupabase
      .from('saas_payments')
      .insert([{
        organizer_id,
        amount: numericAmount,
        concept: concept.trim(),
        notes: notes?.trim() || null,
        payment_method: String(payment_method || 'transferencia'),
        collected_by: user.id,
      }])
      .select('id')
      .single();

    if (pagoError) throw pagoError;

    const { error: perfilError } = await adminSupabase
      .from('profiles')
      .update({ saas_status: 'active' })
      .eq('id', organizer_id);

    if (perfilError) {
      await adminSupabase.from('saas_payments').delete().eq('id', pago.id);
      throw perfilError;
    }

    return NextResponse.json({
      success: true,
      message: 'Pago asentado y cuenta reactivada'
    });

  } catch (error) {
    console.error('Error en /api/saas/cobrar:', error);
    return NextResponse.json({ error: 'No se pudo registrar el pago' }, { status: 500 });
  }
}
