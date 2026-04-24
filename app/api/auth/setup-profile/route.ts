import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/setup-profile
 *
 * Idempotently creates a firm + users row for a newly signed-in user.
 * Uses SERVICE ROLE only — bypasses RLS entirely.
 *
 * Identity resolution order:
 *  1. Authorization: Bearer <token> header
 *  2. access_token in JSON body
 *  3. Supabase auth cookie (sb-*-auth-token) parsed from Cookie header
 */
export async function POST(req: Request) {
  console.log('[setup-profile] ▶ request received')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let userId: string | null = null
  let userEmail: string | null = null

  // 1. Bearer token
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (bearerToken && bearerToken.length > 10) {
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken)
    if (!error && user) {
      userId = user.id
      userEmail = user.email ?? null
      console.log('[setup-profile] resolved via bearer token:', userId)
    }
  }

  // 2. Body token
  if (!userId) {
    try {
      const body = await req.clone().json() as { access_token?: string }
      if (body.access_token && body.access_token.length > 10) {
        const { data: { user }, error } = await supabase.auth.getUser(body.access_token)
        if (!error && user) {
          userId = user.id
          userEmail = user.email ?? null
          console.log('[setup-profile] resolved via body token:', userId)
        }
      }
    } catch { /* body not JSON — skip */ }
  }

  // 3. Cookie-based auth (sb-*-auth-token cookie)
  if (!userId) {
    try {
      const cookieHeader = req.headers.get('cookie') ?? ''
      // Match Supabase's new chunked or legacy cookie format
      const cookieMatch = cookieHeader.match(/sb-[^=]+-auth-token(?:\.0)?=([^;]+)/)
      if (cookieMatch) {
        const decoded = decodeURIComponent(cookieMatch[1])
        let token: string | null = null
        try {
          const parsed = JSON.parse(decoded)
          token = Array.isArray(parsed) ? parsed[0] : (parsed?.access_token ?? null)
        } catch {
          token = decoded
        }
        if (token && token.length > 10) {
          const { data: { user }, error } = await supabase.auth.getUser(token)
          if (!error && user) {
            userId = user.id
            userEmail = user.email ?? null
            console.log('[setup-profile] resolved via cookie token:', userId)
          }
        }
      }
    } catch (e) {
      console.warn('[setup-profile] cookie parse failed:', e)
    }
  }

  if (!userId || !userEmail) {
    console.error('[setup-profile] ✗ could not resolve user identity')
    return NextResponse.json({ error: 'Unauthorized — could not resolve user' }, { status: 401 })
  }

  console.log('setup-profile: starting for', userId)

  // ── Check if already complete ────────────────────────────────────────────
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, firm_id')
    .eq('id', userId)
    .single()

  if (existingUser?.firm_id) {
    console.log('[setup-profile] ✓ already complete, firm_id:', existingUser.firm_id)
    return NextResponse.json({ success: true, firm_id: existingUser.firm_id, created: false })
  }

  // ── Create or find firm ──────────────────────────────────────────────────
  let firmId: string
  const firmSlug = `firm-${userId.slice(0, 8)}`
  const firmName = `${userEmail.split('@')[0]}'s Firm`

  if (existingUser && !existingUser.firm_id) {
    // User row exists but no firm — create firm only
    const { data: newFirm, error: firmErr } = await supabase
      .from('firms')
      .insert({ name: firmName, slug: firmSlug, plan: 'trial' })
      .select('id')
      .single()

    if (firmErr) {
      const { data: existing } = await supabase.from('firms').select('id').eq('slug', firmSlug).single()
      if (!existing) {
        console.error('[setup-profile] firm creation failed:', firmErr.message)
        return NextResponse.json({ error: `Firm creation failed: ${firmErr.message}` }, { status: 500 })
      }
      firmId = existing.id
    } else {
      firmId = newFirm!.id
    }

    await supabase.from('users').update({ firm_id: firmId }).eq('id', userId)
  } else {
    // No user row at all — create firm + user
    const { data: firmData, error: firmErr } = await supabase
      .from('firms')
      .upsert(
        { name: firmName, slug: firmSlug, plan: 'trial' },
        { onConflict: 'slug', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (firmErr || !firmData) {
      const { data: existing } = await supabase.from('firms').select('id').eq('slug', firmSlug).single()
      if (!existing) {
        console.error('[setup-profile] firm upsert failed:', firmErr?.message)
        return NextResponse.json({ error: `Firm setup failed: ${firmErr?.message}` }, { status: 500 })
      }
      firmId = existing.id
    } else {
      firmId = firmData.id
    }

    console.log('setup-profile: firm created', firmId)

    const { error: userErr } = await supabase
      .from('users')
      .upsert(
        { id: userId, email: userEmail, firm_id: firmId, role: 'owner' },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (userErr) {
      console.error('[setup-profile] user upsert failed:', userErr.message)
      return NextResponse.json({ error: `User setup failed: ${userErr.message}` }, { status: 500 })
    }

    console.log('setup-profile: user created', userId)
  }

  console.log('[setup-profile] ✓ complete, firm_id:', firmId!)
  return NextResponse.json({ success: true, firm_id: firmId! })
}

/**
 * GET /api/auth/setup-profile?redirect=/dashboard
 * Cookie-based setup then redirect.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('redirect') ?? url.searchParams.get('next') ?? '/dashboard'

  // Re-use POST logic by delegating
  const postReq = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
  })
  await POST(postReq)

  return NextResponse.redirect(new URL(next, url.origin))
}
