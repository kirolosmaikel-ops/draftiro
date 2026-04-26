import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/admin-create-user
 * Creates a user with email_confirm=true via the Supabase admin API.
 * This bypasses email confirmation so the user can sign in immediately.
 * For first-time setup only — protected by service role key.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Supabase env vars not configured' }, { status: 500 })
  }

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password must be at least 6 characters' }, { status: 400 })
  }

  const supabase = createClient(url, serviceKey)

  // Check if user already exists
  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingUser = existing?.users?.find(u => u.email === email)

  if (existingUser) {
    // Update password and confirm email on existing user
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.log('[admin-create-user] updated existing user:', data.user?.id)
    return NextResponse.json({ ok: true, action: 'updated', userId: data.user?.id, email })
  }

  // Create new confirmed user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also run setup-profile
  if (data.user) {
    const firmSlug = `firm-${data.user.id.slice(0, 8)}`
    await supabase.from('firms').upsert(
      { name: `${email.split('@')[0]}'s Firm`, slug: firmSlug, plan: 'trial' },
      { onConflict: 'slug' }
    )
    const { data: firm } = await supabase.from('firms').select('id').eq('slug', firmSlug).single()
    if (firm) {
      await supabase.from('users').upsert(
        { id: data.user.id, email, firm_id: firm.id, role: 'owner' },
        { onConflict: 'id' }
      )
    }
  }

  console.log('[admin-create-user] created user:', data.user?.id)
  return NextResponse.json({ ok: true, action: 'created', userId: data.user?.id, email })
}
