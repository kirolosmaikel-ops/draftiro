import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/signin
 *
 * Server-side sign-in. Accepts a native HTML form POST (multipart or
 * application/x-www-form-urlencoded) with fields: email, password, mode.
 *
 * Doing sign-in server-side (instead of browser client) guarantees the
 * session cookie is set in the HTTP *response* header, which the browser
 * stores and sends on the very next navigation — no client/server cookie
 * sync race condition.
 */
export async function POST(req: Request) {
  const { origin } = new URL(req.url)

  let email: string | null = null
  let password: string | null = null

  // Accept both form-data and JSON bodies
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      const body = await req.json() as { email?: string; password?: string }
      email = body.email?.trim() ?? null
      password = body.password ?? null
    } catch { /* ignore */ }
  } else {
    try {
      const formData = await req.formData()
      email = (formData.get('email') as string | null)?.trim() ?? null
      password = (formData.get('password') as string | null) ?? null
    } catch { /* ignore */ }
  }

  if (!email || !password) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Email and password are required')}`,
      { status: 303 }
    )
  }

  console.log('[signin] attempting sign-in for:', email)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[signin] ✗ error:', error.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
      { status: 303 }
    )
  }

  console.log('[signin] ✓ signed in user:', data.user?.id)

  // Run setup-profile to ensure firm+user rows exist
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

  return NextResponse.redirect(`${origin}/dashboard`, { status: 303 })
}
