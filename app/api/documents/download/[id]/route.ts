import { NextResponse } from 'next/server'
import { createClient as serviceClient } from '@supabase/supabase-js'
import { createClient as cookieClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/documents/download/:id
 * Returns { url } pointing to a 1-hour signed Supabase Storage URL for the
 * document. Auth: Bearer first, cookie fallback. Verifies firm_id ownership.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const docId = params.id
  if (!docId) return NextResponse.json({ error: 'Document id required' }, { status: 400 })

  // Bearer first, cookie fallback
  let user: { id: string } | null = null
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const svc = serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  if (token) {
    user = (await svc.auth.getUser(token)).data.user ?? null
  }
  if (!user) {
    try {
      const c = await cookieClient()
      const result = await Promise.race([
        c.auth.getUser(),
        new Promise<{ data: { user: null } }>(r => setTimeout(() => r({ data: { user: null } }), 3000)),
      ])
      user = result.data.user ?? null
    } catch { user = null }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await svc.from('users').select('firm_id').eq('id', user.id).single()
  if (!userRow?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  const { data: doc } = await svc
    .from('documents')
    .select('storage_path, firm_id, name')
    .eq('id', docId)
    .single()
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (doc.firm_id !== userRow.firm_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'documents'
  const { data: signed, error } = await svc.storage
    .from(bucket)
    .createSignedUrl(doc.storage_path, 60 * 60)
  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? 'Could not sign URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl, name: doc.name })
}
