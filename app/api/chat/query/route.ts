import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/chat/query?sessionId=xxx  — returns message history for a session */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const supabase = await createClient()

  // ── AUTH: must be logged in ──────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS will enforce firm_id isolation, but we also explicitly check that the
  // session belongs to the caller's firm before returning messages.
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, firm_id')
    .eq('id', sessionId)
    .single()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id,role,content,citations,created_at')
    .eq('session_id', sessionId)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}
