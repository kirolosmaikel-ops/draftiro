import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

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
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not add any logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/auth/setup-profile') ||
    pathname.startsWith('/api/auth/admin-create-user') ||
    pathname.startsWith('/api/auth/signin')

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login (but not from landing page /)
  if (user && pathname === '/login') {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard'
    const url = request.nextUrl.clone()
    url.pathname = next
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  // ── Profile guard: ensure firm+user rows exist ───────────────────────────
  // Only runs for authenticated users on protected page routes (not API routes,
  // not onboarding, not the setup-profile endpoint itself).
  const isPageRoute = !pathname.startsWith('/api/')
  const isOnboarding = pathname.startsWith('/onboarding')

  if (user && isPageRoute && !isPublicRoute && !isOnboarding) {
    try {
      // Use service-role client — the user row may not exist yet so the
      // RLS-scoped anon client would block the SELECT.
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: userRow } = await serviceSupabase
        .from('users')
        .select('firm_id')
        .eq('id', user.id)
        .single()

      if (!userRow?.firm_id) {
        // Profile missing — run setup-profile server-side
        console.log('[middleware] no firm_id for user', user.id, '— running setup-profile')
        const origin = request.nextUrl.origin
        try {
          const setupRes = await fetch(`${origin}/api/auth/setup-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Pass the access token from the session cookie
              // The setup-profile route will verify it
              Authorization: `Bearer ${request.cookies.get('sb-access-token')?.value ?? ''}`,
            },
            body: JSON.stringify({ access_token: request.cookies.get('sb-access-token')?.value }),
          })
          const result = await setupRes.json()
          console.log('[middleware] setup-profile result:', result)
        } catch (e) {
          console.error('[middleware] setup-profile fetch failed:', e)
        }
      }
    } catch (e) {
      // Non-fatal: log but don't block the request
      console.error('[middleware] profile guard error:', e)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
