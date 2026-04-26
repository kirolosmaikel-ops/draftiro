import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/login
 *
 * Authenticates server-side and returns the session tokens. The CLIENT then
 * calls supabase.auth.setSession() with these tokens, which writes cookies
 * via @supabase/ssr in the canonical format every other consumer (middleware,
 * route handlers, server components) reads.
 *
 * Why this two-step dance: writing the cookie ourselves on the server runs
 * into format-version mismatches with @supabase/ssr. Letting the SDK on the
 * client own the cookie lifecycle eliminates that class of bug entirely.
 */
export async function POST(req: Request) {
  let email: string, password: string
  try {
    const body = await req.json() as { email?: string; password?: string }
    email = body.email?.trim() ?? ''
    password = body.password ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Supabase is not configured on this server' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[auth/login] signInWithPassword error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  if (!data.session) {
    return NextResponse.json(
      { error: 'No session returned. Visit /setup to create a confirmed account.' },
      { status: 401 }
    )
  }

  console.log('[auth/login] ✓ signed in user:', data.session.user.id)

  // Provision firm/user profile (non-fatal)
  if (serviceKey) {
    try {
      const service = createClient(supabaseUrl, serviceKey)
      const userId = data.session.user.id
      const userEmail = data.session.user.email ?? email

      const { data: existingUser } = await service
        .from('users')
        .select('id, firm_id')
        .eq('id', userId)
        .single()

      if (!existingUser?.firm_id) {
        const firmSlug = `firm-${userId.slice(0, 8)}`
        const { data: firmData } = await service
          .from('firms')
          .upsert(
            { name: `${userEmail.split('@')[0]}'s Firm`, slug: firmSlug, plan: 'trial' },
            { onConflict: 'slug', ignoreDuplicates: false }
          )
          .select('id')
          .single()

        if (firmData) {
          await service
            .from('users')
            .upsert(
              { id: userId, email: userEmail, firm_id: firmData.id, role: 'owner' },
              { onConflict: 'id', ignoreDuplicates: false }
            )
          console.log('[auth/login] profile created, firm_id:', firmData.id)
        }
      }
    } catch (profileErr) {
      console.error('[auth/login] profile setup error (non-fatal):', profileErr)
    }
  }

  // Hand the tokens to the client; the browser SDK will own the cookie write.
  return NextResponse.json({
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
}
