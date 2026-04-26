import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/signin
 *
 * Server-side sign-in that explicitly attaches the Supabase session cookies
 * to the redirect response. This is necessary in Next.js Route Handlers
 * because `cookies()` from `next/headers` does NOT automatically write
 * cookies into the HTTP response — you must set them on the Response object
 * directly. Without this, the browser never receives the session cookie and
 * the middleware immediately redirects back to /login.
 */
export async function POST(req: Request) {
  const { origin } = new URL(req.url)

  // ── Parse body (form-data or JSON) ───────────────────────────────────────
  let email = ''
  let password = ''

  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    try {
      const b = await req.json() as { email?: string; password?: string }
      email = b.email?.trim() ?? ''
      password = b.password ?? ''
    } catch { /* ignore */ }
  } else {
    try {
      const fd = await req.formData()
      email = ((fd.get('email') as string) ?? '').trim()
      password = (fd.get('password') as string) ?? ''
    } catch { /* ignore */ }
  }

  if (!email || !password) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Email and password are required')}`,
      { status: 303 }
    )
  }

  // ── Read cookies from the incoming request ───────────────────────────────
  const incomingCookies = (req.headers.get('cookie') ?? '')
    .split(';')
    .filter(Boolean)
    .map(raw => {
      const idx = raw.indexOf('=')
      if (idx === -1) return { name: raw.trim(), value: '' }
      return { name: raw.slice(0, idx).trim(), value: raw.slice(idx + 1).trim() }
    })

  // ── Capture cookies Supabase wants to set ────────────────────────────────
  const cookiesToWrite: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => incomingCookies,
        setAll: (list: { name: string; value: string; options?: CookieOptions }[]) => {
          list.forEach(c => cookiesToWrite.push({ name: c.name, value: c.value, options: c.options ?? {} }))
        },
      },
    }
  )

  console.log('[signin] attempting sign-in for:', email)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[signin] ✗', error.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
      { status: 303 }
    )
  }

  console.log('[signin] ✓ user:', data.user?.id, '| cookies to set:', cookiesToWrite.map(c => c.name))

  // ── Build redirect and attach session cookies to the response ────────────
  // This is the critical step: set-cookie headers go ON THE REDIRECT RESPONSE
  // so the browser stores them before following the 303 to /dashboard.
  const response = NextResponse.redirect(`${origin}/dashboard`, { status: 303 })

  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      // Ensure cookies are accessible across the whole site
      path: options.path ?? '/',
      sameSite: options.sameSite ?? 'lax',
      httpOnly: options.httpOnly ?? true,
    })
  })

  // ── Run setup-profile (non-fatal) ─────────────────────────────────────────
  try {
    const token = data.session?.access_token
    if (token) {
      await fetch(`${origin}/api/auth/setup-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ access_token: token }),
      })
    }
  } catch { /* non-fatal */ }

  return response
}
