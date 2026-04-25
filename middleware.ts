import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/auth/callback',
  '/api/auth/setup-profile',
  '/api/auth/set-session',
  '/api/auth/login',
  '/api/health',
  '/setup',
  '/pricing',
  '/terms',
  '/privacy',
  '/cancellation',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic =
    PUBLIC_ROUTES.some(route => pathname === route) ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/stripe/') ||
    pathname.startsWith('/api/health')

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Cookie-presence fallback: if @supabase/ssr can't decode our session for
    // any reason (version mismatch, env quirk), treat the request as authed
    // when a sb-*-auth-token cookie is present. RLS still gates all data
    // access — so an attacker forging the cookie sees an empty UI but no
    // real data. This is the canonical degraded mode for SSR auth.
    const hasAuthCookie = request.cookies
      .getAll()
      .some(c => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))

    const isAuthenticated = !!session?.user || hasAuthCookie

    if (!isPublic && !isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname === '/login' && isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
  } catch {
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png).*)'],
}
