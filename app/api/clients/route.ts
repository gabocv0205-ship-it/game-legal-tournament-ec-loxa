import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { rejectCrossOriginRequest } from '@/lib/security';

function clientCreationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists')) {
    return { status: 409, message: 'Ya existe un usuario registrado con ese correo' };
  }
  if (normalized.includes('password')) {
    return { status: 400, message: 'La contraseña no cumple los requisitos de Supabase' };
  }
  if (normalized.includes('database error') || normalized.includes('trigger')) {
    return { status: 500, message: 'Supabase no pudo sincronizar Auth con profiles. Ejecuta nuevamente supabase/saas_setup.sql' };
  }

  return { status: 500, message: 'Supabase rechazó la creación del cliente. Revisa los registros de Auth en Supabase' };
}

async function getSuperadminClients() {
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAdminKey) {
    return { response: NextResponse.json({ error: 'La configuración administrativa de Supabase está incompleta' }, { status: 500 }) };
  }

  const admin = createAdminClient(supabaseUrl, supabaseAdminKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: perfil } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (perfil?.role !== 'superadmin') {
    return { response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) };
  }

  return { user, admin };
}

export async function GET() {
  try {
    const auth = await getSuperadminClients();
    if (auth.response) return auth.response;

    const { data, error } = await auth.admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ clientes: data || [] });
  } catch (error) {
    console.error('Error al cargar clientes SaaS:', error);
    return NextResponse.json({ error: 'No se pudieron cargar los clientes' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;

    const auth = await getSuperadminClients();
    if (auth.response) return auth.response;

    const { id, saas_status, max_tournaments } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Cliente no especificado' }, { status: 400 });
    }

    const updates: { saas_status?: string; max_tournaments?: number } = {};
    if (saas_status !== undefined) {
      if (!['active', 'pending_payment', 'suspended'].includes(saas_status)) {
        return NextResponse.json({ error: 'Estado SaaS inválido' }, { status: 400 });
      }
      updates.saas_status = saas_status;
    }
    if (max_tournaments !== undefined) {
      const limit = Number(max_tournaments);
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
        return NextResponse.json({ error: 'Límite de torneos inválido' }, { status: 400 });
      }
      updates.max_tournaments = limit;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios válidos' }, { status: 400 });
    }

    const { data: target, error: targetError } = await auth.admin
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    if (target.role === 'superadmin') {
      return NextResponse.json({ error: 'El perfil superadmin no puede modificarse desde este módulo' }, { status: 403 });
    }

    const { data, error } = await auth.admin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, cliente: data });
  } catch (error) {
    console.error('Error al actualizar cliente SaaS:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el cliente' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;

    const auth = await getSuperadminClients();
    if (auth.response) return auth.response;

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const full_name = String(body.full_name || '').trim();
    if (!email || !password || password.length < 6 || !full_name) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña válida son obligatorios' }, { status: 400 });
    }

    const { data: authData, error: authError } = await auth.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      const response = clientCreationError(authError);
      return NextResponse.json({ error: response.message }, { status: response.status });
    }
    const userId = authData.user.id;

    const { error: profileError } = await auth.admin.from('profiles').upsert({
      id: userId,
      email,
      full_name,
      role: 'organizer',
      saas_status: 'active',
      max_tournaments: 1
    });

    if (profileError) {
      await auth.admin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error) {
    console.error('Error al crear cliente SaaS:', error);
    const response = clientCreationError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
