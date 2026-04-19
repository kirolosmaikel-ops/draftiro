import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/setup-profile
 *
 * Creates a firm + users row for a newly signed-in user.
 * IDEMPOTENT — safe to call on every sign-in; uses upsert so running
 * it twice never creates duplicates or errors.
 *
 * Called from:
 *  1. /app/auth/callback/route.ts — immediately after exchangeCodeForSession
 *  2. middleware.ts — if getUser() succeeds but no row exists in public.users
 *  3. Client pages — as a last-resort fallback
 */
export async function POST(req: Request) {
  console.log('[setup-profile] ▶ request received')

  // ── Auth: accept either cookie session or Bearer token ──────────────────
  // We use the service-role client so we can bypass RLS and do the upsert
  // even before the user row exists (which would make RLS block the insert).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try to resolve the caller's identity:
  //   a) Bearer token in Authorization header (from auth callback redirect)
  //   b) Fall back to cookie session via anon client
  let userId: string | null = null
  let userEmail: string | null = null

  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerToken) {
    console.log('[setup-profile] using bearer token')
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken)
    if (error) {
      console.error('[setup-profile] bearer token invalid:', error.message)
    } else if (user) {
      userId = user.id
      userEmail = user.email ?? null
    }
  }

  // Also try body JSON (token can be passed in body for flexibility)
  if (!userId) {
    try {
      const body = await req.clone().json() as { access_token?: string }
      if (body.access_token) {
        const { data: { user }, error } = await supabase.auth.getUser(body.access_token)
        if (!error && user) {
          userId = user.id
          userEmail = user.email ?? null
          console.log('[setup-profile] resolved user from body token:', userId)
        }
      }
    } catch { /* body may not be JSON */ }
  }

  if (!userId || !userEmail) {
    console.error('[setup-profile] ✗ could not resolve user identity')
    return NextResponse.json({ error: 'Unauthorized — could not resolve user' }, { status: 401 })
  }

  console.log('[setup-profile] resolved user:', userId, userEmail)

  // ── 1. Check if user row already exists ─────────────────────────────────
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, firm_id')
    .eq('id', userId)
    .single()

  if (existingUser?.firm_id) {
    console.log('[setup-profile] ✓ profile already complete, firm_id:', existingUser.firm_id)
    return NextResponse.json({ ok: true, firmId: existingUser.firm_id, created: false })
  }

  // ── 2. Create or find a firm for this user ───────────────────────────────
  let firmId: string

  if (existingUser && !existingUser.firm_id) {
    // User row exists but firm is missing — create firm and patch
    console.log('[setup-profile] user row exists but no firm — creating firm')
    const firmSlug = `firm-${userId.slice(0, 8)}`
    const { data: newFirm, error: firmErr } = await supabase
      .from('firms')
      .insert({ name: `${userEmail.split('@')[0]}'s Firm`, slug: firmSlug, plan: 'trial' })
      .select('id')
      .single()

    if (firmErr) {
      // Slug conflict? Try to find by slug
      const { data: existingFirm } = await supabase
        .from('firms')
        .select('id')
        .eq('slug', firmSlug)
        .single()
      if (!existingFirm) {
        console.error('[setup-profile] firm creation failed:', firmErr.message)
        return NextResponse.json({ error: `Firm creation failed: ${firmErr.message}` }, { status: 500 })
      }
      firmId = existingFirm.id
    } else {
      firmId = newFirm!.id
    }

    await supabase.from('users').update({ firm_id: firmId }).eq('id', userId)
    console.log('[setup-profile] ✓ patched user with firm_id:', firmId)
  } else {
    // No user row at all — create firm + user together
    console.log('[setup-profile] no user row — creating firm + user from scratch')
    const firmSlug = `firm-${userId.slice(0, 8)}`

    // Upsert firm (handles concurrent calls safely)
    const { data: firmData, error: firmErr } = await supabase
      .from('firms')
      .upsert(
        { name: `${userEmail.split('@')[0]}'s Firm`, slug: firmSlug, plan: 'trial' },
        { onConflict: 'slug', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (firmErr || !firmData) {
      // Upsert may return no data on conflict with ignoreDuplicates — fetch it
      const { data: existing } = await supabase.from('firms').select('id').eq('slug', firmSlug).single()
      if (!existing) {
        console.error('[setup-profile] firm upsert failed:', firmErr?.message)
        return NextResponse.json({ error: `Firm setup failed: ${firmErr?.message}` }, { status: 500 })
      }
      firmId = existing.id
    } else {
      firmId = firmData.id
    }

    // Upsert user row
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

    console.log('[setup-profile] ✓ created firm:', firmId, '+ user:', userId)
  }

  return NextResponse.json({ ok: true, firmId, created: true })
}

/** GET /api/auth/setup-profile?redirect=/dashboard
 *  Runs the full profile setup using the cookie session, then redirects.
 *  Used by middleware and email-confirmed sign-ups. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('redirect') ?? url.searchParams.get('next') ?? '/dashboard'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try to resolve via cookie session (server-side)
  let userId: string | null = null
  let userEmail: string | null = null

  // Read the sb-access-token cookie manually if present
  const cookieHeader = req.headers.get('cookie') ?? ''
  const tokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)
  if (tokenMatch) {
    try {
      const decoded = decodeURIComponent(tokenMatch[1])
      const parsed = JSON.parse(decoded)
      const token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) { userId = user.id; userEmail = user.email ?? null }
      }
    } catch { /* ignore parse errors */ }
  }

  if (userId && userEmail) {
    // Run minimal upsert inline so the GET is self-contained
    const firmSlug = `firm-${userId.slice(0, 8)}`
    let firmId: string | null = null
    const { data: existingUser } = await supabase.from('users').select('id,firm_id').eq('id', userId).single()
    if (existingUser?.firm_id) {
      firmId = existingUser.firm_id
    } else {
      const { data: fData } = await supabase.from('firms')
        .upsert({ name: `${userEmail.split('@')[0]}'s Firm`, slug: firmSlug, plan: 'trial' }, { onConflict: 'slug', ignoreDuplicates: false })
        .select('id').single()
      const { data: fExisting } = fData ? { data: fData } : await supabase.from('firms').select('id').eq('slug', firmSlug).single()
      if (fExisting) {
        firmId = fExisting.id
        await supabase.from('users').upsert({ id: userId, email: userEmail, firm_id: firmId, role: 'owner' }, { onConflict: 'id' })
      }
    }
    console.log('[setup-profile GET] ✓ ensured profile, firm_id:', firmId)
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
