'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
}
interface Doc {
  id: string
  name: string
  mime_type: string | null
  size_bytes: number | null
  status: string
  created_at: string
}

function fileExt(name: string) {
  return name.split('.').pop()?.toUpperCase() ?? 'FILE'
}
function fileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function KnowledgePage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [tab, setTab] = useState<'documents' | 'notes' | 'summary'>('documents')
  const [clientSearch, setClientSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function loadClients() {
      setLoadError(null)
      try {
        // Ensure profile/firm exists first
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userRow } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
          if (!userRow?.firm_id) {
            await fetch('/api/auth/setup-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
          }
        }

        const { data, error: fetchErr } = await supabase
          .from('clients')
          .select('id,name,email,phone,created_at')
          .order('name')

        if (fetchErr) {
          setLoadError(`Failed to load clients: ${fetchErr.message}`)
        } else {
          setClients(data ?? [])
          if (data?.length) setSelectedClient(data[0])
        }
      } catch (e) {
        setLoadError(`Unexpected error: ${e}`)
      }
    }
    loadClients()
  }, [])

  useEffect(() => {
    if (!selectedClient) return
    supabase
      .from('documents')
      .select('id,name,mime_type,size_bytes,status,created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setDocs(data ?? []))
    setSummary(null)
  }, [selectedClient])

  async function loadSummary() {
    if (!selectedClient || summary) return
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/knowledge/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id }),
      })
      const json = await res.json()
      setSummary(json.summary ?? 'No summary available.')
    } catch {
      setSummary('Failed to load summary.')
    }
    setSummaryLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedClient) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    if (selectedClient) form.append('clientId', selectedClient.id)
    await fetch('/api/documents/upload', { method: 'POST', body: form })
    // Refresh docs
    const { data } = await supabase
      .from('documents')
      .select('id,name,mime_type,size_bytes,status,created_at')
      .order('created_at', { ascending: false })
    setDocs(data ?? [])
    setUploading(false)
    e.target.value = ''
  }

  const filtered = clientSearch
    ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  const initials = (name: string) => name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  const avatarColors = ['#1D1D1F', '#1A4FBF', '#8B6914', '#1A7A4A', '#A0281A']
  const avatarColor = (i: number) => avatarColors[i % avatarColors.length]

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{
        height: '52px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '12px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>Knowledge Base</span>
        <div style={{ marginLeft: 'auto' }}>
          <button style={{
            background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '0 16px', height: '32px', fontSize: '12.5px', fontWeight: 600,
            fontFamily: 'Manrope, sans-serif', cursor: 'pointer',
          }}>
            + New Client
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Client column */}
        <div style={{ width: '300px', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', background: '#F7F6F3', flexShrink: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', background: '#fff' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F', flex: 1 }}>Clients</span>
          </div>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <input
              value={clientSearch} onChange={e => setClientSearch(e.target.value)}
              placeholder="🔍  Search clients…"
              style={{ width: '100%', height: '30px', background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px', padding: '0 12px', fontSize: '12.5px', fontFamily: 'Manrope, sans-serif', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadError ? (
              <div style={{ padding: '16px', color: '#A0281A', fontSize: '12px', background: '#FFE8E6', margin: '8px', borderRadius: '8px' }}>
                {loadError}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9A9A96', fontSize: '12.5px' }}>No clients yet</div>
            ) : filtered.map((c, i) => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
                  background: selectedClient?.id === c.id ? '#fff' : 'transparent',
                  borderLeft: selectedClient?.id === c.id ? '2px solid #C9A84C' : '2px solid transparent',
                }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', background: avatarColor(i),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: '#9A9A96', marginTop: '1px' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Matter column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
          {!selectedClient ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9A96', fontSize: '13.5px' }}>
              Select a client to view their files
            </div>
          ) : (
            <>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px' }}>
                    {selectedClient.name}
                  </div>
                  {selectedClient.email && (
                    <div style={{ fontSize: '12px', color: '#6B6B68', marginTop: '2px' }}>
                      {selectedClient.email}{selectedClient.phone ? ` · ${selectedClient.phone}` : ''}
                    </div>
                  )}
                </div>
                <label style={{
                  background: 'none', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px',
                  padding: '0 12px', height: '30px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  color: '#3A3A38', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'Manrope, sans-serif',
                  opacity: uploading ? 0.6 : 1,
                }}>
                  <input type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                  {uploading ? 'Uploading…' : '+ Upload Document'}
                </label>
                <a href={`/chat`} style={{
                  background: '#1D1D1F', color: '#fff', borderRadius: '10px',
                  padding: '0 14px', height: '32px', fontSize: '12.5px', fontWeight: 600,
                  textDecoration: 'none', display: 'flex', alignItems: 'center',
                }}>
                  Chat with Files
                </a>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 24px', background: '#fff', flexShrink: 0 }}>
                {(['documents', 'notes', 'summary'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); if (t === 'summary') loadSummary() }}
                    style={{
                      padding: '11px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 500,
                      color: tab === t ? '#1D1D1F' : '#6B6B68', background: 'none', border: 'none',
                      borderBottom: `2px solid ${tab === t ? '#1D1D1F' : 'transparent'}`,
                      cursor: 'pointer', marginBottom: '-1px', fontFamily: 'Manrope, sans-serif',
                    }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {tab === 'documents' && (
                  docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#9A9A96', fontSize: '13.5px' }}>
                      No documents yet. Upload one above.
                    </div>
                  ) : docs.map(d => {
                    const ext = fileExt(d.name)
                    const isPdf = ext === 'PDF'
                    return (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '6px', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, flexShrink: 0,
                          background: isPdf ? '#FFE8E6' : '#EEF3FF',
                          color: isPdf ? '#A0281A' : '#1A4FBF',
                        }}>
                          {ext.slice(0, 3)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                          <div style={{ fontSize: '11px', color: '#9A9A96', marginTop: '1px' }}>
                            {new Date(d.created_at).toLocaleDateString()}{d.size_bytes ? ` · ${fileSize(d.size_bytes)}` : ''} · {d.status}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a href={`/chat`} style={{
                            width: '28px', height: '28px', border: '1px solid rgba(0,0,0,0.07)',
                            background: '#F7F6F3', borderRadius: '6px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', color: '#6B6B68', textDecoration: 'none',
                          }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V4a1 1 0 011-1z" /></svg>
                          </a>
                        </div>
                      </div>
                    )
                  })
                )}
                {tab === 'notes' && (
                  <textarea
                    placeholder="Add notes about this client…"
                    style={{ width: '100%', minHeight: '200px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px', padding: '14px', fontSize: '13.5px', fontFamily: 'Newsreader, serif', lineHeight: 1.8, color: '#3A3A38', outline: 'none', resize: 'vertical' }}
                  />
                )}
                {tab === 'summary' && (
                  <div>
                    {summaryLoading ? (
                      <div style={{ color: '#9A9A96', fontSize: '13.5px' }}>Generating AI summary…</div>
                    ) : summary ? (
                      <div style={{ background: '#F7F6F3', borderRadius: '14px', padding: '16px 18px', borderLeft: '3px solid #C9A84C' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '8px' }}>
                          AI Case Summary
                        </div>
                        <p style={{ fontSize: '13px', color: '#3A3A38', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary}</p>
                      </div>
                    ) : (
                      <div style={{ color: '#9A9A96', fontSize: '13.5px' }}>Click &quot;AI Summary&quot; tab to generate a summary.</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
