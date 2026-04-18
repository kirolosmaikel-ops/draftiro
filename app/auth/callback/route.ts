import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[auth/callback] ▶ code present:', !!code)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] ✗ exchangeCodeForSession failed:', error.message)
      return NextResponse.redirect(`${origin}/login?error=auth_error`)
    }

    console.log('[auth/callback] ✓ session established for user:', data.user?.id)

    // ── Run profile setup immediately after login ────────────────────────
    // This ensures firm + users rows exist before the user hits any page.
    // Using the access_token so the setup-profile route can verify identity.
    try {
      const accessToken = data.session?.access_token
      if (accessToken) {
        console.log('[auth/callback] calling setup-profile…')
        const setupRes = await fetch(`${origin}/api/auth/setup-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ access_token: accessToken }),
        })
        const setupJson = await setupRes.json()
        console.log('[auth/callback] setup-profile response:', setupJson)
      }
    } catch (setupErr) {
      // Non-fatal — user can still reach dashboard; middleware will retry
      console.error('[auth/callback] setup-profile threw:', setupErr)
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  console.warn('[auth/callback] no code in URL — redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
