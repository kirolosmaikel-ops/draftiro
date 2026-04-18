import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as serviceClientDirect } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/** POST /api/editor/save — upsert a draft */
export async function POST(req: Request) {
  console.log('[editor/save] ▶ request received')

  const body = await req.json() as { id?: string; title: string; content: string; caseId?: string }
  const { id, title, content, caseId } = body

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[editor/save] ✗ not authenticated')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get firm_id — use service client to bypass RLS in case of missing rows
  const svc = serviceClientDirect(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: userData } = await svc.from('users').select('firm_id').eq('id', user.id).single()
  const firmId = userData?.firm_id ?? null

  if (!firmId) {
    console.warn('[editor/save] ⚠ no firm_id for user', user.id, '— triggering setup-profile')
    // Try to create profile on the fly
    try {
      const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
      await fetch(`${origin}/api/auth/setup-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch { /* non-fatal */ }
    // After setup attempt, re-fetch firm_id
    const { data: retryUser } = await svc.from('users').select('firm_id').eq('id', user.id).single()
    if (!retryUser?.firm_id) {
      return NextResponse.json({
        error: 'Profile setup not complete. Please sign out and sign in again.',
      }, { status: 422 })
    }
  }

  // Re-fetch in case setup ran above
  const { data: finalUserData } = await svc.from('users').select('firm_id').eq('id', user.id).single()
  const finalFirmId = finalUserData?.firm_id ?? firmId

  if (id) {
    // Update existing draft
    const { data, error } = await svc
      .from('drafts')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', user.id)
      .select('id')
      .single()

    if (error) {
      console.error('[editor/save] ✗ update failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.log('[editor/save] ✓ updated draft:', id)
    return NextResponse.json(data)
  }

  // Create new draft
  const { data, error } = await svc
    .from('drafts')
    .insert({
      firm_id: finalFirmId,
      case_id: caseId ?? null,
      title,
      content,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[editor/save] ✗ insert failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[editor/save] ✓ created draft:', data?.id)
  return NextResponse.json(data)
}
