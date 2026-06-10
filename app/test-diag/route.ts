import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    nodeVersion: process.version,
    envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NO EXISTE',
    anonExiste: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anonLongitud: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    serviceExiste: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceLongitud: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    servicePrimeros20: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'NO EXISTE',
    serviceUltimos20: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(-20) || 'NO EXISTE',
    cwd: process.cwd(),
  });
}
