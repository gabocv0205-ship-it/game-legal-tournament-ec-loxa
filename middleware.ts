import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Buscamos de forma segura si existe la cookie del token de Supabase
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(cookie => cookie.name.includes('-auth-token'));

  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isLogin = request.nextUrl.pathname.startsWith('/login');

  // 1. Si intenta entrar al panel sin estar verificado, lo bloqueamos y enviamos al login
  if (isDashboard && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Si ya está logueado y va a la pantalla de login o al inicio, lo pasamos directo al panel
  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si todo está en orden, permitimos que la navegación continúe
  return NextResponse.next();
}

export const config = {
  // Solo ejecutamos el guardia en estas rutas estratégicas para no ralentizar la plataforma
  matcher: ['/dashboard/:path*', '/login'],
};
