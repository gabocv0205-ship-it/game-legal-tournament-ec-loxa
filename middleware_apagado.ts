import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresca la sesión si está expirando y obtiene el usuario actual
  const { data: { user } } = await supabase.auth.getUser()

  // REGLAS DE PROTECCIÓN DE RUTAS
  // Si el usuario NO está autenticado y NO está en la página de login, lo expulsamos
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si el usuario SÍ está autenticado e intenta ir al login, lo mandamos a su panel
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/' // Ruta del dashboard principal
    return NextResponse.redirect(url)
  }

  return response
}

// Configuración: Define qué rutas vigilará el Middleware
export const config = {
  matcher: [
    /*
     * Vigila todas las rutas EXCEPTO:
     * - _next/static (archivos estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico (ícono del navegador)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}