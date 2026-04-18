import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ts = new Date().toISOString()

  // ── Supabase connectivity ─────────────────────────────────────────────────
  let supabaseStatus: string = 'not configured'
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const svc = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      // A lightweight query — just check if we can reach the DB
      const { error } = await svc.from('firms').select('id').limit(1)
      supabaseStatus = error ? `error: ${error.message}` : 'connected'
    } catch (e) {
      supabaseStatus = `error: ${String(e).slice(0, 120)}`
    }
  }

  return NextResponse.json({
    status: 'ok',
    ts,
    supabase: supabaseStatus,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    llamaparse: !!process.env.LLAMAPARSE_API_KEY,
    storage_bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'documents (default)',
  })
}
