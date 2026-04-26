import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as serviceClient } from '@supabase/supabase-js'

/** GET /api/chat/query?sessionId=xxx  — returns message history for a session */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  // Bearer first (deterministic), cookies as fallback (cookies can hang)
  let user: { id: string; email?: string } | null = null
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (token) {
    const tmp = serviceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    user = (await tmp.auth.getUser(token)).data.user ?? null
  }
  if (!user) {
    try {
      const supabase = await createClient()
      const result = await Promise.race([
        supabase.auth.getUser(),
        new Promise<{ data: { user: null } }>(r => setTimeout(() => r({ data: { user: null } }), 3000)),
      ])
      user = result.data.user ?? null
    } catch { user = null }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service client so RLS doesn't block when cookie auth context is missing.
  // We've already validated the user above; firm_id check below ensures isolation.
  const svc = serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: userRow } = await svc.from('users').select('firm_id').eq('id', user.id).single()
  const firmId = userRow?.firm_id ?? null

  const { data: session } = await svc
    .from('chat_sessions')
    .select('id, firm_id')
    .eq('id', sessionId)
    .single()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.firm_id !== firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await svc
    .from('chat_messages')
    .select('id,role,content,citations,created_at')
    .eq('session_id', sessionId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}
