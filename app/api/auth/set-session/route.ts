import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

/**
 * POST /api/auth/set-session
 *
 * Receives { access_token, refresh_token } from the browser after a client-side
 * signInWithPassword call, and writes the session cookies SERVER-SIDE so they are
 * committed to the browser via Set-Cookie headers BEFORE the /dashboard navigation.
 *
 * This eliminates the race condition where window.location.href fires before the
 * browser has fully persisted cookies written by the client-side Supabase SDK.
 */
export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json() as {
      access_token?: string
      refresh_token?: string
    }

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    // Build the response first so we can attach Set-Cookie headers to it
    const response = NextResponse.json({ ok: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options ?? {})
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })

    if (error || !data.session) {
      console.error('[set-session] setSession failed:', error?.message)
      return NextResponse.json({ error: error?.message ?? 'Session invalid' }, { status: 401 })
    }

    console.log('[set-session] ✓ session cookies written for user:', data.session.user.id)
    return response
  } catch (e) {
    console.error('[set-session] unexpected error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
