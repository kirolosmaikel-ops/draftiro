'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

interface Client {
  id: string
  firm_id: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
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

interface Case {
  id: string
  title: string
  practice_area: string | null
  status: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fileExt(name: string) {
  return name.split('.').pop()?.toUpperCase() ?? 'FILE'
}

function fileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = ['#0F0F0E', '#1A4FBF', '#8B6914', '#1A7A4A', '#A0281A']

function avatarColor(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Transition constant ────────────────────────────────────────────────────

const TR = '0.18s cubic-bezier(0.4,0,0.2,1)'

// ── Component ──────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const supabase = createClient()

  // Client list state
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [filterChip, setFilterChip] = useState<'all' | 'active' | 'archived'>('all')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Right-column state
  const [tab, setTab] = useState<'documents' | 'notes' | 'ai-summary'>('documents')
  const [docs, setDocs] = useState<Doc[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadCaseId, setUploadCaseId] = useState<string>('')
  const [uploadError, setUploadError] = useState('')

  // AI Summary
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Modals
  const [showNewClient, setShowNewClient] = useState(false)
  const newClientBackdropRef = useRef(false)
  const [showNewMatter, setShowNewMatter] = useState(false)

  // New-client form
  const [ncName, setNcName] = useState('')
  const [ncEmail, setNcEmail] = useState('')
  const [ncPhone, setNcPhone] = useState('')
  const [ncCompany, setNcCompany] = useState('')
  const [ncNotes, setNcNotes] = useState('')
  const [ncSaving, setNcSaving] = useState(false)

  // New-matter form
  const [nmTitle, setNmTitle] = useState('')
  const [nmArea, setNmArea] = useState('')
  const [nmSaving, setNmSaving] = useState(false)

  // Hover state helpers
  const [hoveredClient, setHoveredClient] = useState<string | null>(null)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [hoveredActionBtn, setHoveredActionBtn] = useState<string | null>(null)

  // ── Load clients on mount ────────────────────────────────────────────────

  useEffect(() => {
    loadClients()
  }, [])

  // ── Poll status of any non-indexed documents ─────────────────────────────
  useEffect(() => {
    const pending = docs.filter(d => d.status !== 'indexed' && d.status !== 'error')
    if (pending.length === 0) return
    const id = setInterval(async () => {
      const updates = await Promise.all(pending.map(async d => {
        try {
          const r = await fetch(`/api/documents/status/${d.id}`)
          if (!r.ok) return null
          const j = await r.json() as { status: string }
          return { id: d.id, status: j.status }
        } catch { return null }
      }))
      setDocs(prev => prev.map(d => {
        const u = updates.find(x => x && x.id === d.id)
        return u ? { ...d, status: u.status } : d
      }))
    }, 3000)
    return () => clearInterval(id)
  }, [docs])

  // ESC closes the New Client modal
  useEffect(() => {
    if (!showNewClient) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') resetNewClientModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showNewClient])

  async function loadClients() {
    setLoadError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userRow } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
        if (!userRow?.firm_id) {
          await fetch('/api/auth/setup-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        }
      }
      const { data, error: fetchErr } = await supabase
        .from('clients')
        .select('id,firm_id,name,email,phone,company,notes,created_at')
        .order('name')
      if (fetchErr) {
        setLoadError(`Failed to load clients: ${fetchErr.message}`)
      } else {
        setClients(data ?? [])
        if (data?.length && !selectedClient) {
          selectClient(data[0])
        }
      }
    } catch (e) {
      setLoadError(`Unexpected error: ${e}`)
    }
  }

  // ── Select client → load docs + cases ───────────────────────────────────

  function selectClient(c: Client) {
    setSelectedClient(c)
    setTab('documents')
    setSummary(null)
    setNotes(c.notes ?? '')

    supabase
      .from('documents')
      .select('id,name,mime_type,size_bytes,status,created_at')
      .eq('client_id', c.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDocs(data ?? []))

    supabase
      .from('cases')
      .select('id,title,practice_area,status')
      .eq('client_id', c.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setCases(data ?? []))
  }

  // ── AI Summary ───────────────────────────────────────────────────────────

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

  // ── Upload document ──────────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedClient) return
    setUploading(true)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('clientId', selectedClient.id)
      if (uploadCaseId) form.append('caseId', uploadCaseId)
      // Send the access token explicitly (cookie auth has been unreliable)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: form,
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setUploadError(j.error ?? `Upload failed (${res.status})`)
      }
      const { data } = await supabase
        .from('documents')
        .select('id,name,mime_type,size_bytes,status,created_at')
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: false })
      setDocs(data ?? [])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

  // ── Create client ────────────────────────────────────────────────────────

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    if (!ncName.trim()) return
    setNcSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    let firm_id: string | null = null
    if (user) {
      const { data: userRow } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
      firm_id = userRow?.firm_id ?? null
    }
    const { data, error } = await supabase
      .from('clients')
      .insert({ firm_id, name: ncName.trim(), email: ncEmail.trim() || null, phone: ncPhone.trim() || null, company: ncCompany.trim() || null, notes: ncNotes.trim() || null })
      .select()
      .single()
    setNcSaving(false)
    if (!error && data) {
      setClients(prev => [data, ...prev])
      selectClient(data)
      setShowNewClient(false)
      setNcName(''); setNcEmail(''); setNcPhone(''); setNcCompany(''); setNcNotes('')
    }
  }

  function resetNewClientModal() {
    setShowNewClient(false)
    setNcName(''); setNcEmail(''); setNcPhone(''); setNcCompany(''); setNcNotes('')
  }

  // ── Create matter ────────────────────────────────────────────────────────

  async function handleCreateMatter(e: React.FormEvent) {
    e.preventDefault()
    if (!nmTitle.trim() || !selectedClient) return
    setNmSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    let firm_id: string | null = null
    if (user) {
      const { data: userRow } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
      firm_id = userRow?.firm_id ?? null
    }
    const { data, error } = await supabase
      .from('cases')
      .insert({ firm_id, client_id: selectedClient.id, title: nmTitle.trim(), practice_area: nmArea.trim() || null, status: 'active' })
      .select()
      .single()
    setNmSaving(false)
    if (!error && data) {
      setCases(prev => [data, ...prev])
      setShowNewMatter(false)
      setNmTitle(''); setNmArea('')
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = clients.filter(c => {
    const matchSearch = clientSearch
      ? c.name.toLowerCase().includes(clientSearch.toLowerCase())
      : true
    return matchSearch
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>

      {/* ── Topbar ── */}
      <div style={{
        height: '52px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '12px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F0F0E', letterSpacing: '-0.2px' }}>
          Knowledge Base
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setShowNewClient(true)}
            style={{
              background: '#0F0F0E',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0 16px',
              height: '32px',
              fontSize: '12.5px',
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: TR,
            }}
          >
            + New Client
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left column: Client list ── */}
        <div style={{
          width: '300px',
          borderRight: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          flexDirection: 'column',
          background: '#F7F6F3',
          flexShrink: 0,
        }}>

          {/* Column header */}
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F0F0E', flex: 1 }}>Clients</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#9A9A96',
              background: '#EFEDE8',
              padding: '2px 7px',
              borderRadius: '99px',
            }}>
              {clients.length}
            </span>
          </div>

          {/* Search */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ position: 'relative' }}>
              <svg
                width="13" height="13"
                viewBox="0 0 16 16"
                fill="none" stroke="#9A9A96" strokeWidth="1.8"
                style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5l3 3" />
              </svg>
              <input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Search clients…"
                style={{
                  width: '100%',
                  height: '30px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: '10px',
                  padding: '0 12px 0 28px',
                  fontSize: '12.5px',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#0F0F0E',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Filter chips */}
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: '6px' }}>
            {(['all', 'active', 'archived'] as const).map(chip => (
              <button
                key={chip}
                onClick={() => setFilterChip(chip)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '99px',
                  border: '1px solid rgba(0,0,0,0.07)',
                  background: filterChip === chip ? '#0F0F0E' : 'transparent',
                  color: filterChip === chip ? '#FFFFFF' : '#6B6B68',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: TR,
                }}
              >
                {chip.charAt(0).toUpperCase() + chip.slice(1)}
              </button>
            ))}
          </div>

          {/* Client list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadError ? (
              <div style={{
                margin: '8px',
                padding: '12px 14px',
                background: '#FFE8E6',
                borderRadius: '8px',
                color: '#A0281A',
                fontSize: '12px',
                lineHeight: 1.5,
              }}>
                {loadError}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9A9A96', fontSize: '12.5px' }}>
                No clients yet
              </div>
            ) : filtered.map((c, i) => {
              const isActive = selectedClient?.id === c.id
              const isHovered = hoveredClient === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => selectClient(c)}
                  onMouseEnter={() => setHoveredClient(c.id)}
                  onMouseLeave={() => setHoveredClient(null)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: isActive || isHovered ? '#FFFFFF' : 'transparent',
                    borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent',
                    transition: TR,
                  }}
                >
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: avatarColor(i),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    flexShrink: 0,
                  }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F0F0E',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9A9A96', marginTop: '1px' }}>
                      {cases.length > 0 && selectedClient?.id === c.id
                        ? `${cases.length} matter${cases.length !== 1 ? 's' : ''}`
                        : c.company ?? 'Client'}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9A9A96', flexShrink: 0 }}>
                    {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FFFFFF' }}>
          {!selectedClient ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9A9A96',
              gap: '8px',
            }}>
              <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="#C8C8C4" strokeWidth="1.2">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" />
              </svg>
              <span style={{ fontSize: '13.5px' }}>Select a client to view their files</span>
            </div>
          ) : (
            <>
              {/* Client header — wraps to a second row when actions don't fit */}
              <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(0,0,0,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexShrink: 0,
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#0F0F0E',
                    letterSpacing: '-0.5px',
                  }}>
                    {selectedClient.name}
                  </div>
                  {(selectedClient.email || selectedClient.phone) && (
                    <div style={{ fontSize: '12px', color: '#6B6B68', marginTop: '2px' }}>
                      {[selectedClient.email, selectedClient.phone].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                {/* Optional: attach upload to a specific matter */}
                {cases.length > 0 && (
                  <select
                    value={uploadCaseId}
                    onChange={e => setUploadCaseId(e.target.value)}
                    disabled={uploading}
                    style={{
                      height: '30px',
                      border: '1px solid rgba(0,0,0,0.07)',
                      borderRadius: '10px',
                      padding: '0 10px',
                      fontSize: '12px',
                      color: '#3A3A38',
                      background: '#fff',
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">Attach to: client (no matter)</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>Attach to: {c.title}</option>
                    ))}
                  </select>
                )}

                {/* Upload button */}
                <label style={{
                  background: 'none',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  height: '30px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  color: '#3A3A38',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: uploading ? 0.6 : 1,
                  transition: TR,
                }}>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    style={{ display: 'none' }}
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  {uploading ? 'Uploading…' : '↑ Upload'}
                </label>

                {/* New Matter */}
                <button
                  onClick={() => setShowNewMatter(true)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    height: '30px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: '#3A3A38',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: TR,
                  }}
                >
                  + New Matter
                </button>

                {/* Chat with Files — pass first matching case so the AI has context */}
                <a
                  href={uploadCaseId ? `/chat?case=${uploadCaseId}` : cases[0]?.id ? `/chat?case=${cases[0].id}` : '/chat'}
                  style={{
                    background: '#0F0F0E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 14px',
                    height: '32px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: TR,
                  }}
                >
                  Chat with Files
                </a>
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(0,0,0,0.07)',
                padding: '0 24px',
                background: '#FFFFFF',
                flexShrink: 0,
              }}>
                {(['documents', 'notes', 'ai-summary'] as const).map(t => {
                  const label = t === 'ai-summary' ? 'AI Summary' : t === 'documents' ? 'Documents' : 'Notes'
                  const isActive = tab === t
                  const isHov = hoveredTab === t
                  return (
                    <button
                      key={t}
                      onClick={() => { setTab(t); if (t === 'ai-summary') loadSummary() }}
                      onMouseEnter={() => setHoveredTab(t)}
                      onMouseLeave={() => setHoveredTab(null)}
                      style={{
                        padding: '11px 16px',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#0F0F0E' : isHov ? '#3A3A38' : '#6B6B68',
                        background: 'none',
                        border: 'none',
                        borderBottom: `2px solid ${isActive ? '#0F0F0E' : 'transparent'}`,
                        cursor: 'pointer',
                        marginBottom: '-1px',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: TR,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Tab body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                {uploadError && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                    background: '#FFE8E6', color: '#A0281A', border: '1px solid #FFBDBA',
                    fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
                  }}>
                    ⚠ {uploadError}
                  </div>
                )}

                {/* Documents tab */}
                {tab === 'documents' && (
                  docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#9A9A96', fontSize: '13.5px' }}>
                      No documents yet. Upload one above.
                    </div>
                  ) : (
                    docs.map(d => {
                      const ext = fileExt(d.name)
                      const isPdf = ext === 'PDF'
                      const btnId = `chat-${d.id}`
                      return (
                        <div
                          key={d.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 0',
                            borderBottom: '1px solid rgba(0,0,0,0.07)',
                          }}
                        >
                          {/* File icon */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 700,
                            flexShrink: 0,
                            background: isPdf ? '#FFE8E6' : '#EEF3FF',
                            color: isPdf ? '#A0281A' : '#1A4FBF',
                          }}>
                            {ext.slice(0, 3)}
                          </div>

                          {/* File info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#0F0F0E',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {d.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9A9A96', marginTop: '1px' }}>
                              {fmt(d.created_at)}
                              {d.size_bytes ? ` · ${fileSize(d.size_bytes)}` : ''}
                              {` · `}
                              <span style={{
                                color: d.status === 'indexed' ? '#1A7A4A' : d.status === 'error' ? '#A0281A' : '#8B6914',
                                fontWeight: 600,
                              }}>
                                {d.status === 'indexed' ? 'Ready ✓'
                                  : d.status === 'error' ? 'Failed'
                                  : d.status === 'processing' ? 'Processing…'
                                  : `${d.status}…`}
                              </span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                            {/* Chat icon — opens the chat preselected to this document */}
                            <a
                              href={`/chat?doc=${d.id}`}
                              id={btnId}
                              onMouseEnter={() => setHoveredActionBtn(btnId)}
                              onMouseLeave={() => setHoveredActionBtn(null)}
                              style={{
                                width: '28px',
                                height: '28px',
                                border: '1px solid rgba(0,0,0,0.07)',
                                background: hoveredActionBtn === btnId ? '#0F0F0E' : '#F7F6F3',
                                borderColor: hoveredActionBtn === btnId ? '#0F0F0E' : 'rgba(0,0,0,0.07)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: hoveredActionBtn === btnId ? '#FFFFFF' : '#6B6B68',
                                textDecoration: 'none',
                                transition: TR,
                              }}
                              title="Chat with document"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M3 3h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V4a1 1 0 011-1z" />
                              </svg>
                            </a>
                            {/* Download — opens signed Storage URL */}
                            <button
                              onClick={async () => {
                                const { data: { session } } = await supabase.auth.getSession()
                                const headers: Record<string, string> = {}
                                if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
                                const r = await fetch(`/api/documents/download/${d.id}`, { headers })
                                if (!r.ok) return
                                const j = await r.json() as { url: string }
                                window.open(j.url, '_blank')
                              }}
                              title="Download"
                              style={{
                                width: '28px', height: '28px',
                                border: '1px solid rgba(0,0,0,0.07)',
                                background: '#F7F6F3',
                                borderRadius: '6px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#6B6B68',
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M8 2v9M5 8l3 3 3-3M3 14h10" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )
                )}

                {/* Notes tab */}
                {tab === 'notes' && (
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add notes about this client…"
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      border: '1px solid rgba(0,0,0,0.07)',
                      borderRadius: '10px',
                      padding: '14px',
                      fontSize: '14px',
                      fontFamily: "'Newsreader', serif",
                      lineHeight: 1.8,
                      color: '#3A3A38',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                )}

                {/* AI Summary tab */}
                {tab === 'ai-summary' && (
                  <div>
                    {summaryLoading ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#9A9A96',
                        fontSize: '13.5px',
                        padding: '16px 0',
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #C9A84C',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        Generating AI summary…
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      </div>
                    ) : summary ? (
                      <div style={{
                        background: '#F7F6F3',
                        borderRadius: '14px',
                        padding: '16px 18px',
                        borderLeft: '3px solid #C9A84C',
                        marginTop: '8px',
                      }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: '#8B6914',
                          marginBottom: '10px',
                        }}>
                          AI Summary
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {summary.split('\n').filter(Boolean).map((line, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: '12.5px',
                                color: '#3A3A38',
                                lineHeight: 1.5,
                                padding: '3px 0 3px 14px',
                                position: 'relative',
                              }}
                            >
                              <span style={{
                                position: 'absolute',
                                left: 0,
                                color: '#C9A84C',
                                fontSize: '16px',
                                lineHeight: 1.2,
                              }}>·</span>
                              {line.replace(/^[-•]\s*/, '')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div style={{ color: '#9A9A96', fontSize: '13.5px', padding: '16px 0' }}>
                        Loading summary…
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          New Client Modal
      ══════════════════════════════════════════ */}
      {showNewClient && (
        <div
          onMouseDown={e => { newClientBackdropRef.current = e.target === e.currentTarget }}
          onMouseUp={e => {
            if (newClientBackdropRef.current && e.target === e.currentTarget) resetNewClientModal()
            newClientBackdropRef.current = false
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
              margin: '0 16px',
            }}
          >
            <h2 style={{
              fontFamily: "'Newsreader', serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#0F0F0E',
              marginBottom: '20px',
              letterSpacing: '-0.4px',
            }}>
              New Client
            </h2>

            <form onSubmit={handleCreateClient}>
              {/* Full Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>
                  Full Name <span style={{ color: '#A0281A' }}>*</span>
                </label>
                <input
                  required
                  value={ncName}
                  onChange={e => setNcName(e.target.value)}
                  placeholder="Jane Smith"
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '13.5px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#0F0F0E',
                    outline: 'none',
                    background: '#F7F6F3',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={ncEmail}
                  onChange={e => setNcEmail(e.target.value)}
                  placeholder="jane@example.com"
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '13.5px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#0F0F0E',
                    outline: 'none',
                    background: '#F7F6F3',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={ncPhone}
                  onChange={e => setNcPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '13.5px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#0F0F0E',
                    outline: 'none',
                    background: '#F7F6F3',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Company */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>
                  Company / Organization
                </label>
                <input
                  value={ncCompany}
                  onChange={e => setNcCompany(e.target.value)}
                  placeholder="Acme Corp"
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '13.5px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#0F0F0E',
                    outline: 'none',
                    background: '#F7F6F3',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>
                  Notes
                </label>
                <textarea
                  value={ncNotes}
                  onChange={e => setNcNotes(e.target.value)}
                  placeholder="Any initial notes…"
                  rows={3}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#0F0F0E',
                    outline: 'none',
                    background: '#F7F6F3',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={resetNewClientModal}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 16px',
                    height: '36px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: '#3A3A38',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: TR,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ncSaving || !ncName.trim()}
                  style={{
                    background: '#0F0F0E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 20px',
                    height: '36px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: ncSaving || !ncName.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: ncSaving || !ncName.trim() ? 0.6 : 1,
                    transition: TR,
                  }}
                >
                  {ncSaving ? 'Creating…' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          New Matter Modal
      ══════════════════════════════════════════ */}
      {showNewMatter && (
        <div
          onClick={() => { setShowNewMatter(false); setNmTitle(''); setNmArea('') }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
              margin: '0 16px',
            }}
          >
            <h2 style={{
              fontFamily: "'Newsreader', serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#0F0F0E',
              marginBottom: '6px',
              letterSpacing: '-0.4px',
            }}>
              New Matter
            </h2>
            {selectedClient && (
              <p style={{ fontSize: '12.5px', color: '#6B6B68', marginBottom: '20px' }}>
                For {selectedClient.name}
              </p>
            )}

            <form onSubmit={handleCreateMatter}>
              {/* Case Title */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>
                  Case Title <span style={{ color: '#A0281A' }}>*</span>
                </label>
                <input
                  required
                  value={nmTitle}
                  onChange={e => setNmTitle(e.target.value)}
                  placeholder="e.g. Smith v. Jones — Contract Dispute"
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '13.5px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#0F0F0E',
                    outline: 'none',
                    background: '#F7F6F3',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Practice Area */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '5px', fontFamily: "'DM Sans', sans-serif" }}>
                  Practice Area
                </label>
                <input
                  value={nmArea}
                  onChange={e => setNmArea(e.target.value)}
                  placeholder="e.g. Civil Litigation, Family Law…"
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 12px',
                    fontSize: '13.5px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: '#0F0F0E',
                    outline: 'none',
                    background: '#F7F6F3',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowNewMatter(false); setNmTitle(''); setNmArea('') }}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '10px',
                    padding: '0 16px',
                    height: '36px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: '#3A3A38',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: TR,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={nmSaving || !nmTitle.trim()}
                  style={{
                    background: '#0F0F0E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 20px',
                    height: '36px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: nmSaving || !nmTitle.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: nmSaving || !nmTitle.trim() ? 0.6 : 1,
                    transition: TR,
                  }}
                >
                  {nmSaving ? 'Creating…' : 'Create Matter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
