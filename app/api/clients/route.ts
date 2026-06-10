import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (perfil?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { email, password, full_name } = await request.json();

    // 1. Instanciar Supabase con privilegios de administrador (Bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseAdminKey) {
      throw new Error("La configuración administrativa de Supabase está incompleta.");
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseAdminKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 2. Crear usuario silenciosamente en Auth (No cierra la sesión actual)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Lo confirmamos automáticamente
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 3. Sincronizar los datos en la tabla 'profiles' inmediatamente
    // Usamos UPSERT por si tienes un Trigger automático en la BD
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: email,
      full_name: full_name,
      role: 'organizer',
      saas_status: 'active', // Al crearlo empieza al día
      max_tournaments: 1
    });

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
