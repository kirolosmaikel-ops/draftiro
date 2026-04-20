'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DebugData {
  user: { id: string; email: string | undefined } | null
  firm: { id: string; name: string } | null
  counts: { cases: number; documents: number; chunks: number; messages: number }
  lastMessages: { role: string; content: string; created_at: string }[]
  envVars: string[]
  error: string | null
}

export default function DebugPage() {
  const supabase = createClient()
  const [data, setData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // User
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setData({ user: null, firm: null, counts: { cases: 0, documents: 0, chunks: 0, messages: 0 }, lastMessages: [], envVars: [], error: 'Not authenticated' })
          setLoading(false)
          return
        }

        // Firm
        const { data: userRow } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
        let firm: { id: string; name: string } | null = null
        if (userRow?.firm_id) {
          const { data: firmRow } = await supabase.from('firms').select('id,name').eq('id', userRow.firm_id).single()
          firm = firmRow ?? null
        }

        // Counts
        const [casesRes, docsRes, chunksRes, msgsRes] = await Promise.all([
          supabase.from('cases').select('id', { count: 'exact', head: true }),
          supabase.from('documents').select('id', { count: 'exact', head: true }),
          supabase.from('document_chunks').select('id', { count: 'exact', head: true }),
          supabase.from('chat_messages').select('id', { count: 'exact', head: true }),
        ])

        // Last 3 messages
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('role,content,created_at')
          .order('created_at', { ascending: false })
          .limit(3)

        // Env var check via /api/health
        const healthRes = await fetch('/api/health')
        const healthJson = await healthRes.json()
        setHealth(healthJson)

        const envVars: string[] = []
        const knownVars = [
          'NEXT_PUBLIC_SUPABASE_URL',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          'SUPABASE_SERVICE_ROLE_KEY',
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'LLAMAPARSE_API_KEY',
          'SUPABASE_STORAGE_BUCKET',
        ]
        // We can only check client-side accessible env vars directly;
        // server-side ones are reflected in the health response
        if (healthJson.openai) envVars.push('OPENAI_API_KEY')
        if (healthJson.anthropic) envVars.push('ANTHROPIC_API_KEY')
        if (healthJson.llamaparse) envVars.push('LLAMAPARSE_API_KEY')
        if (healthJson.supabase !== 'not configured') {
          envVars.push('NEXT_PUBLIC_SUPABASE_URL')
          envVars.push('SUPABASE_SERVICE_ROLE_KEY')
        }
        // Client-side env vars
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) envVars.push('NEXT_PUBLIC_SUPABASE_URL (client)')
        if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) envVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

        setData({
          user: { id: user.id, email: user.email },
          firm,
          counts: {
            cases: casesRes.count ?? 0,
            documents: docsRes.count ?? 0,
            chunks: chunksRes.count ?? 0,
            messages: msgsRes.count ?? 0,
          },
          lastMessages: msgs ?? [],
          envVars: envVars.filter((v, i, a) => a.indexOf(v) === i),
          error: null,
        })
      } catch (e) {
        setData({ user: null, firm: null, counts: { cases: 0, documents: 0, chunks: 0, messages: 0 }, lastMessages: [], envVars: [], error: String(e) })
      }
      setLoading(false)
    }
    load()
  }, [])

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: '16px', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ width: '200px', fontSize: '12px', fontWeight: 600, color: '#6B6B68', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#1D1D1F', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )

  const pill = (ok: boolean, yes = 'SET', no = 'MISSING') => (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: ok ? '#E8F5EE' : '#FFE8E6', color: ok ? '#1A7A4A' : '#A0281A' }}>
      {ok ? yes : no}
    </span>
  )

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{
        height: '52px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center',
        padding: '0 24px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>Debug Panel</span>
        <span style={{ marginLeft: '10px', fontSize: '11px', color: '#9A9A96' }}>Internal diagnostics — not visible to clients</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: '#1D1D1F', marginBottom: '28px' }}>
          System Debug
        </h1>

        {loading ? (
          <div style={{ color: '#9A9A96', fontSize: '13.5px' }}>Loading diagnostics…</div>
        ) : data?.error && !data.user ? (
          <div style={{ background: '#FFE8E6', border: '1px solid #FFBDBA', borderRadius: '14px', padding: '20px', color: '#A0281A' }}>
            {data.error}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Auth */}
            <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>Authentication</div>
              {row('User ID', data?.user?.id ?? '—')}
              {row('Email', data?.user?.email ?? '—')}
              {row('Firm ID', data?.firm?.id ?? <span style={{ color: '#A0281A', fontWeight: 600 }}>NULL — profile not set up</span>)}
              {row('Firm Name', data?.firm?.name ?? '—')}
            </section>

            {/* Data Counts */}
            <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>Data Counts</div>
              {row('Cases', data?.counts.cases)}
              {row('Documents', data?.counts.documents)}
              {row('Document Chunks', data?.counts.chunks)}
              {row('Chat Messages', data?.counts.messages)}
            </section>

            {/* Last Messages */}
            <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>Last 3 Chat Messages</div>
              {data?.lastMessages.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9A9A96' }}>No messages yet</div>
              ) : data?.lastMessages.map((m, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: m.role === 'user' ? '#EEF3FF' : '#F7F6F3', color: m.role === 'user' ? '#1A4FBF' : '#3A3A38' }}>
                      {m.role}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9A9A96' }}>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#3A3A38', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '600px' }}>
                    {m.content.slice(0, 200)}{m.content.length > 200 ? '…' : ''}
                  </div>
                </div>
              ))}
            </section>

            {/* Environment Variables */}
            <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>Environment Variables (via /api/health)</div>
              {row('NEXT_PUBLIC_SUPABASE_URL', pill(!!process.env.NEXT_PUBLIC_SUPABASE_URL))}
              {row('NEXT_PUBLIC_SUPABASE_ANON_KEY', pill(!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))}
              {row('SUPABASE_SERVICE_ROLE_KEY', pill(health?.supabase !== 'not configured'))}
              {row('OPENAI_API_KEY', pill(!!(health?.openai)))}
              {row('ANTHROPIC_API_KEY', pill(!!(health?.anthropic)))}
              {row('LLAMAPARSE_API_KEY', pill(!!(health?.llamaparse)))}
              {row('SUPABASE_STORAGE_BUCKET', <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{String(health?.storage_bucket ?? '—')}</span>)}
            </section>

            {/* Health Raw */}
            <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>/api/health Response</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                {pill(health?.supabase === 'connected', 'Supabase ✓', `Supabase: ${health?.supabase}`)}
                {pill(!!(health?.openai), 'OpenAI ✓', 'OpenAI missing')}
                {pill(!!(health?.anthropic), 'Anthropic ✓', 'Anthropic missing')}
                {pill(!!(health?.llamaparse), 'LlamaParse ✓', 'LlamaParse missing')}
              </div>
              <pre style={{ fontSize: '11.5px', background: '#F7F6F3', borderRadius: '8px', padding: '12px', overflow: 'auto', color: '#3A3A38' }}>
                {JSON.stringify(health, null, 2)}
              </pre>
            </section>

            {/* Actions */}
            <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '12px' }}>Actions</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/auth/setup-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
                    const json = await res.json()
                    alert(JSON.stringify(json, null, 2))
                  }}
                  style={{ height: '34px', background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Run Setup Profile
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{ height: '34px', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0 16px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer', color: '#3A3A38', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Refresh
                </button>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  )
}
