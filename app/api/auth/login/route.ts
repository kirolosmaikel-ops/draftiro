import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/login
 *
 * Server-side sign-in. Writes the session cookie in the exact format
 * @supabase/ssr v0.3 reads on the next request — bypasses the SDK's cookie
 * adapter entirely (which has been silently failing to fire setAll() in this
 * project, leaving the response with no Set-Cookie headers).
 *
 * Cookie format (per @supabase/ssr v0.3 source):
 *   name:  sb-<projectRef>-auth-token              (chunked: .0, .1 ... if > 3600 bytes)
 *   value: base64-<base64(JSON.stringify(session))>
 *   attrs: HttpOnly, Secure, SameSite=Lax, Path=/
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

  // Plain client — no cookie adapter, no auto-persist.
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
      { error: 'No session returned — your email may need confirmation. Visit /setup to create a confirmed account.' },
      { status: 401 }
    )
  }

  console.log('[auth/login] ✓ signed in user:', data.session.user.id)

  // ── Manually write the cookie in @supabase/ssr v0.3 format ────────────
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  const sessionJson = JSON.stringify(data.session)
  const value = `base64-${Buffer.from(sessionJson, 'utf-8').toString('base64')}`

  const response = NextResponse.json({ ok: true })

  const cookieOpts = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: true,
    // Long enough to survive a week without refresh; Supabase rotates internally.
    maxAge: 60 * 60 * 24 * 7,
  }

  // Chunk if the cookie exceeds the 4 KB browser limit (split at 3600 to be safe).
  const CHUNK = 3600
  if (value.length <= CHUNK) {
    response.cookies.set(cookieName, value, cookieOpts)
  } else {
    for (let i = 0, idx = 0; i < value.length; i += CHUNK, idx++) {
      response.cookies.set(`${cookieName}.${idx}`, value.slice(i, i + CHUNK), cookieOpts)
    }
  }

  // ── Provision firm/user profile (non-fatal) ─────────────────────────────
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

  return response
}
