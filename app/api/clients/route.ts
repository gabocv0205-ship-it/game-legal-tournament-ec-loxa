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

    const [profilesRes, tournamentsRes, activityRes] = await Promise.all([
      auth.admin.from('profiles').select('*').order('created_at', { ascending: false }),
      auth.admin.from('tournaments').select('id, name, user_id, status, registration_fee').neq('status', 'deleted'),
      auth.admin.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    const clientes = (profilesRes.data || []).filter(cliente => !cliente.archived_at).map(cliente => ({
      ...cliente,
      tournaments: (tournamentsRes.data || []).filter(tournament => tournament.user_id === cliente.id),
      activity: (activityRes.data || []).filter(activity => activity.target_id === cliente.id).slice(0, 10),
    }));
    return NextResponse.json({ clientes });
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

    const { id, saas_status, max_tournaments, full_name, email, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Cliente no especificado' }, { status: 400 });
    }

    const updates: { saas_status?: string; max_tournaments?: number; full_name?: string; email?: string } = {};
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
    if (full_name !== undefined) {
      const name = String(full_name).trim();
      if (!name) return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 });
      updates.full_name = name;
    }
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail.includes('@')) return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });
      updates.email = normalizedEmail;
    }
    if (Object.keys(updates).length === 0 && password === undefined) {
      return NextResponse.json({ error: 'No hay cambios válidos' }, { status: 400 });
    }

    const { data: target, error: targetError } = await auth.admin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    if (target.role === 'superadmin') {
      return NextResponse.json({ error: 'El perfil superadmin no puede modificarse desde este módulo' }, { status: 403 });
    }

    if (email !== undefined || password !== undefined) {
      const authUpdates: { email?: string; password?: string } = {};
      if (email !== undefined) authUpdates.email = updates.email;
      if (password !== undefined) {
        const normalizedPassword = String(password);
        if (normalizedPassword.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
        authUpdates.password = normalizedPassword;
      }
      const { error: authError } = await auth.admin.auth.admin.updateUserById(id, authUpdates);
      if (authError) throw authError;
    }

    if (Object.keys(updates).length === 0) {
      await auth.admin.from('admin_activity_log').insert({ actor_id: auth.user.id, target_id: id, action: 'password_reset' });
      return NextResponse.json({ success: true, cliente: target });
    }

    const { data, error } = await auth.admin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    await auth.admin.from('admin_activity_log').insert({ actor_id: auth.user.id, target_id: id, action: password ? 'password_reset' : 'client_updated', details: updates });
    return NextResponse.json({ success: true, cliente: data });
  } catch (error) {
    console.error('Error al actualizar cliente SaaS:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el cliente' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const originError = rejectCrossOriginRequest(request);
    if (originError) return originError;
    const auth = await getSuperadminClients();
    if (auth.response) return auth.response;
    const { id } = await request.json();
    const { data: target } = await auth.admin.from('profiles').select('role').eq('id', id).single();
    if (!target || target.role === 'superadmin') return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 });
    const { error } = await auth.admin.from('profiles').update({ archived_at: new Date().toISOString(), saas_status: 'suspended' }).eq('id', id);
    if (error) throw error;
    await auth.admin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
    await auth.admin.from('admin_activity_log').insert({ actor_id: auth.user.id, target_id: id, action: 'client_archived' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al archivar cliente SaaS:', error);
    return NextResponse.json({ error: 'No se pudo archivar el cliente' }, { status: 500 });
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
