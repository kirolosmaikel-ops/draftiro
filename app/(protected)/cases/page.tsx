'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Case {
  id: string
  title: string
  case_number: string | null
  status: string
  practice_area: string | null
  updated_at: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  active: '#34C759', pending: '#FF9F0A', closed: '#9A9A96', archived: '#C8C8C4',
}

export default function CasesPage() {
  const supabase = createClient()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newArea, setNewArea] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadCases()
  }, [])

  async function loadCases() {
    setLoading(true)
    const { data } = await supabase
      .from('cases')
      .select('id,title,case_number,status,practice_area,updated_at,created_at')
      .order('updated_at', { ascending: false })
    setCases(data ?? [])
    setLoading(false)
  }

  async function createCase(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)

    // Get the user's firm_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase.from('cases').insert({
      title: newTitle.trim(),
      practice_area: newArea.trim() || null,
      status: 'active',
      firm_id: userData?.firm_id,
      created_by: user.id,
    }).select().single()

    if (!error && data) {
      setCases(prev => [data, ...prev])
      setNewTitle('')
      setNewArea('')
      setShowNew(false)
    }
    setSaving(false)
  }

  const filtered = filter === 'all' ? cases : cases.filter(c => c.status === filter)

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{
        height: '52px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '12px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>Cases</span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setShowNew(true)}
            style={{
              background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: '10px',
              padding: '0 16px', height: '32px', fontSize: '12.5px', fontWeight: 600,
              fontFamily: 'Manrope, sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v12M2 8h12" /></svg>
            New Case
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: '#1D1D1F', marginBottom: '4px' }}>
          Cases
        </h1>
        <p style={{ fontSize: '13.5px', color: '#6B6B68', marginBottom: '24px' }}>{cases.length} total</p>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['all', 'active', 'pending', 'closed', 'archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 500,
              border: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
              background: filter === f ? '#1D1D1F' : '#F7F6F3',
              color: filter === f ? '#fff' : '#6B6B68',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* New case form */}
        {showNew && (
          <form onSubmit={createCase} style={{
            background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
            padding: '20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end',
          }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#9A9A96', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Case Title *
              </label>
              <input
                value={newTitle} onChange={e => setNewTitle(e.target.value)} required
                placeholder="e.g. Chen v. Meridian Corp"
                style={{ width: '100%', height: '38px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0 12px', fontSize: '13.5px', fontFamily: 'Manrope, sans-serif', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#9A9A96', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Practice Area
              </label>
              <input
                value={newArea} onChange={e => setNewArea(e.target.value)}
                placeholder="e.g. Corporate Litigation"
                style={{ width: '100%', height: '38px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0 12px', fontSize: '13.5px', fontFamily: 'Manrope, sans-serif', outline: 'none' }}
              />
            </div>
            <button type="submit" disabled={saving} style={{
              height: '38px', background: '#d44439', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '0 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'Manrope, sans-serif',
            }}>
              {saving ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowNew(false)} style={{
              height: '38px', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
              padding: '0 16px', fontSize: '13px', cursor: 'pointer', color: '#9A9A96', fontFamily: 'Manrope, sans-serif',
            }}>
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <div style={{ color: '#9A9A96', fontSize: '13.5px', padding: '40px 0', textAlign: 'center' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
            padding: '48px', textAlign: 'center', color: '#9A9A96', fontSize: '13.5px',
          }}>
            {filter === 'all' ? (
              <>No cases yet. <button onClick={() => setShowNew(true)} style={{ color: '#d44439', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', fontFamily: 'Manrope, sans-serif' }}>Create your first case →</button></>
            ) : `No ${filter} cases.`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(c => (
              <div key={c.id} style={{
                background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[c.status] ?? '#9A9A96', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1D1D1F' }}>{c.title}</div>
                  <div style={{ fontSize: '11.5px', color: '#9A9A96', marginTop: '3px' }}>
                    {c.practice_area ?? 'General'}{c.case_number ? ` · ${c.case_number}` : ''} · Updated {new Date(c.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px',
                  background: c.status === 'active' ? '#E8F5EE' : '#F7F6F3',
                  color: c.status === 'active' ? '#1A7A4A' : '#6B6B68',
                }}>
                  {c.status}
                </span>
                <Link href={`/chat?case=${c.id}`} style={{
                  fontSize: '12px', fontWeight: 600, color: '#1A4FBF', textDecoration: 'none',
                  background: '#EEF3FF', padding: '5px 12px', borderRadius: '8px',
                }}>
                  Chat →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
