import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que no requieren suscripción activa (para poder pagar)
const SUBSCRIPTION_ROUTES = ['/subscribe', '/account']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── No autenticado → login ────────────────
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Autenticado en /login → workspace ─────
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/workspace'
    return NextResponse.redirect(url)
  }

  // ── Trial & suscripción (solo si hay user) ─
  if (user) {
    const pathname = request.nextUrl.pathname

    // No chequear en rutas de suscripción (necesitan acceso para pagar)
    const isSubscriptionRoute = SUBSCRIPTION_ROUTES.some(r => pathname.startsWith(r))
    if (!isSubscriptionRoute) {

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_status, trial_expires_at')
        .eq('id', user.id)
        .single()

      if (profile) {
        const { subscription_status, trial_expires_at } = profile

        // Trial de 24hr expirado → redirigir a /subscribe
        if (subscription_status === 'trialing' && trial_expires_at) {
          const now = new Date()
          const expiry = new Date(trial_expires_at)
          if (now > expiry) {
            const url = request.nextUrl.clone()
            url.pathname = '/subscribe'
            return NextResponse.redirect(url)
          }
        }

        // Trial expirado o cancelado → redirigir a /subscribe
        if (['trial_expired', 'cancelled'].includes(subscription_status)) {
          const url = request.nextUrl.clone()
          url.pathname = '/subscribe'
          return NextResponse.redirect(url)
        }

        // Pago vencido → dejar pasar pero con header de warning
        if (subscription_status === 'past_due') {
          supabaseResponse.headers.set('x-subscription-warning', 'past_due')
        }
      }
      // Si no hay profile, dejarlo pasar (registro en progreso)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
}
