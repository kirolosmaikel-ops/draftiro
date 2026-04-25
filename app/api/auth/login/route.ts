import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

/**
 * POST /api/auth/login
 *
 * Performs signInWithPassword entirely server-side. Cookies are written via
 * next/headers cookies() store — Next.js automatically attaches them to the
 * outgoing response's Set-Cookie headers. Using cookies() (instead of writing
 * to a NextResponse object directly) is the canonical @supabase/ssr pattern
 * and avoids a known issue where the SDK's setAll() never fires when the
 * adapter's getAll() returns an empty array.
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

  const cookieStore = await cookies()

  // Use the cookies() store from next/headers — writes go to the response
  // Set-Cookie headers automatically. Read the *current* cookies (don't lie
  // with []) so the SDK's diffing logic correctly detects the new session and
  // calls setAll() with the access + refresh tokens.
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
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

  // Setup firm/user profile (non-fatal if it fails — already exists for returning users)
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

  return NextResponse.json({ ok: true })
}
