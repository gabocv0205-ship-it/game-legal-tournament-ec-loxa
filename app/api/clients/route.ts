import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    // 1. Instanciar Supabase con privilegios de administrador (Bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseAdminKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
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
