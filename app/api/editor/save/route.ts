import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** POST /api/editor/save — upsert a draft */
export async function POST(req: Request) {
  const body = await req.json() as { id?: string; title: string; content: string; caseId?: string }
  const { id, title, content, caseId } = body

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase.from('users').select('firm_id').eq('id', user.id).single()

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from('drafts')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', user.id)
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Create new
  const { data, error } = await supabase
    .from('drafts')
    .insert({
      firm_id: userData?.firm_id,
      case_id: caseId ?? null,
      title,
      content,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
