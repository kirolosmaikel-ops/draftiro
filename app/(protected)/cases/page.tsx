'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Case {
  id: string
  title: string
  case_number: string | null
  status: string
  practice_area: string | null
  client_id: string | null
  updated_at: string
  created_at: string
}

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
}

const STATUS_DOT: Record<string, string> = {
  active: '#34C759',
  pending: '#FF9F0A',
  closed: '#9A9A96',
  archived: '#C8C8C4',
}

const STATUS_BADGE_BG: Record<string, string> = {
  active: '#E8F5EE',
  pending: '#FFF5E6',
  closed: '#F7F6F3',
  archived: '#F7F6F3',
}

const STATUS_BADGE_COLOR: Record<string, string> = {
  active: '#1A7A4A',
  pending: '#8B5500',
  closed: '#6B6B68',
  archived: '#9A9A96',
}

const FILTERS = ['all', 'active', 'pending', 'closed', 'archived'] as const

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: '#9A9A96',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '6px',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {label}
        {required && <span style={{ color: '#A0281A', marginLeft: '3px' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          height: '38px',
          border: `1px solid ${focused ? '#C9A84C' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: '8px',
          padding: '0 12px',
          fontSize: '13.5px',
          fontFamily: 'DM Sans, sans-serif',
          color: '#0F0F0E',
          outline: 'none',
          background: '#ffffff',
          boxSizing: 'border-box',
          transition: 'border-color 0.18s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: '#9A9A96',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '6px',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={3}
        style={{
          width: '100%',
          border: `1px solid ${focused ? '#C9A84C' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '13.5px',
          fontFamily: 'DM Sans, sans-serif',
          color: '#0F0F0E',
          outline: 'none',
          background: '#ffffff',
          resize: 'vertical',
          boxSizing: 'border-box',
          transition: 'border-color 0.18s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 600,
          color: '#9A9A96',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '6px',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          height: '38px',
          border: `1px solid ${focused ? '#C9A84C' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: '8px',
          padding: '0 12px',
          fontSize: '13.5px',
          fontFamily: 'DM Sans, sans-serif',
          color: '#0F0F0E',
          outline: 'none',
          background: '#ffffff',
          boxSizing: 'border-box',
          appearance: 'none',
          WebkitAppearance: 'none',
          transition: 'border-color 0.18s cubic-bezier(0.4,0,0.2,1)',
          cursor: 'pointer',
        }}
      >
        {children}
      </select>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Close on ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Backdrop click using mousedown+mouseup tracking — only close if BOTH
  // events landed on the backdrop. Prevents close when a native <select>
  // option click ends outside the modal box.
  const downOnBackdrop = useRef(false)
  function onBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    downOnBackdrop.current = e.target === e.currentTarget
  }
  function onBackdropMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (downOnBackdrop.current && e.target === e.currentTarget) onClose()
    downOnBackdrop.current = false
  }

  return (
    <div
      onMouseDown={onBackdropMouseDown}
      onMouseUp={onBackdropMouseUp}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '28px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          margin: '0 16px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: '20px',
              fontWeight: 700,
              color: '#0F0F0E',
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9A9A96',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const STATUS_OPTIONS: Case['status'][] = ['active', 'pending', 'closed', 'archived']

function CaseRow({ c, onStatusChange }: { c: Case; onStatusChange: (id: string, status: Case['status']) => void }) {
  const [hovered, setHovered] = useState(false)
  const [updating, setUpdating] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        border: `1px solid ${hovered ? '#C8C8C4' : 'rgba(0,0,0,0.07)'}`,
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: STATUS_DOT[c.status] ?? '#9A9A96',
          flexShrink: 0,
        }}
      />

      {/* Title + meta */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#0F0F0E',
            fontFamily: 'DM Sans, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {c.title}
        </div>
        <div
          style={{
            fontSize: '11.5px',
            color: '#9A9A96',
            marginTop: '3px',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {c.practice_area ?? 'General'}
          {c.case_number ? ` · ${c.case_number}` : ''}
          {' · Updated '}
          {new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Status badge — click to change */}
      <select
        value={c.status}
        disabled={updating}
        onChange={async e => {
          const next = e.target.value as Case['status']
          if (next === c.status) return
          setUpdating(true)
          await onStatusChange(c.id, next)
          setUpdating(false)
        }}
        title="Change status"
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '3px 22px 3px 10px',
          borderRadius: '99px',
          background: STATUS_BADGE_BG[c.status] ?? '#F7F6F3',
          color: STATUS_BADGE_COLOR[c.status] ?? '#6B6B68',
          fontFamily: 'DM Sans, sans-serif',
          flexShrink: 0,
          textTransform: 'capitalize',
          border: 'none',
          appearance: 'none',
          cursor: updating ? 'wait' : 'pointer',
          outline: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 16 16' fill='none' stroke='%236B6B68' stroke-width='2'><path d='M4 6l4 4 4-4'/></svg>")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
        }}
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>

      {/* Chat link */}
      <Link
        href={`/chat?case=${c.id}`}
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#1A4FBF',
          textDecoration: 'none',
          background: '#EEF3FF',
          padding: '5px 12px',
          borderRadius: '8px',
          flexShrink: 0,
          fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        Chat →
      </Link>
    </div>
  )
}

const PRACTICE_AREAS = [
  '',
  'Corporate Litigation',
  'Family Law',
  'Criminal Defense',
  'Real Estate',
  'Employment Law',
  'Intellectual Property',
  'Immigration',
  'Estate Planning',
  'Bankruptcy',
  'Personal Injury',
  'Contract Law',
  'Other',
]

export default function CasesPage() {
  const supabase = createClient()

  const [cases, setCases] = useState<Case[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  // New Case modal state
  const [showNewCase, setShowNewCase] = useState(false)
  const [newCaseTitle, setNewCaseTitle] = useState('')
  const [newCasePracticeArea, setNewCasePracticeArea] = useState('')
  const [newCaseClientId, setNewCaseClientId] = useState('')
  const [savingCase, setSavingCase] = useState(false)
  const [caseError, setCaseError] = useState('')

  // New Client modal state
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientCompany, setNewClientCompany] = useState('')
  const [newClientNotes, setNewClientNotes] = useState('')
  const [savingClient, setSavingClient] = useState(false)
  const [clientError, setClientError] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [casesRes, clientsRes] = await Promise.all([
      supabase
        .from('cases')
        .select('id,title,case_number,status,practice_area,client_id,updated_at,created_at')
        .order('updated_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id,name,email,phone,company')
        .order('name', { ascending: true }),
    ])

    if (casesRes.error) {
      setError(`Failed to load cases: ${casesRes.error.message}`)
    } else {
      setCases(casesRes.data ?? [])
    }

    setClients(clientsRes.data ?? [])
    setLoading(false)
  }

  async function getFirmId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
    return data?.firm_id ?? null
  }

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault()
    setCaseError('')
    if (!newCaseTitle.trim()) {
      setCaseError('Case title is required.')
      return
    }
    setSavingCase(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCaseError('Your session has expired. Please sign in again.')
      setSavingCase(false)
      return
    }

    const firmId = await getFirmId()

    const { data, error } = await supabase.from('cases').insert({
      title: newCaseTitle.trim(),
      practice_area: newCasePracticeArea.trim() || null,
      client_id: newCaseClientId || null,
      status: 'active',
      firm_id: firmId,
      created_by: user.id,
    }).select().single()

    if (error) {
      setCaseError(error.message || 'Could not create case. Try again.')
    } else if (data) {
      setCases(prev => [data, ...prev])
      setNewCaseTitle('')
      setNewCasePracticeArea('')
      setNewCaseClientId('')
      setShowNewCase(false)
    }
    setSavingCase(false)
  }

  async function handleStatusChange(id: string, status: Case['status']) {
    // Optimistic update
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    const { error } = await supabase
      .from('cases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      // Revert on failure
      const { data } = await supabase
        .from('cases')
        .select('id,title,case_number,status,practice_area,client_id,updated_at,created_at')
        .order('updated_at', { ascending: false })
      setCases(data ?? [])
    }
  }

  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault()
    setClientError('')
    if (!newClientName.trim()) {
      setClientError('Full name is required.')
      return
    }
    setSavingClient(true)

    const firmId = await getFirmId()

    const { data, error } = await supabase.from('clients').insert({
      name: newClientName.trim(),
      email: newClientEmail.trim() || null,
      phone: newClientPhone.trim() || null,
      company: newClientCompany.trim() || null,
      notes: newClientNotes.trim() || null,
      firm_id: firmId,
    }).select().single()

    if (error) {
      setClientError(error.message || 'Could not add client. Try again.')
    } else if (data) {
      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewClientName('')
      setNewClientEmail('')
      setNewClientPhone('')
      setNewClientCompany('')
      setNewClientNotes('')
      setShowNewClient(false)
    }
    setSavingClient(false)
  }

  const filtered = filter === 'all' ? cases : cases.filter(c => c.status === filter)

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
        {/* ── TOPBAR ── */}
        <div
          style={{
            height: '52px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: '12px',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0F0F0E',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Cases
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* New Client — ghost button */}
            <button
              onClick={() => setShowNewClient(true)}
              style={{
                background: 'transparent',
                color: '#3A3A38',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '10px',
                padding: '0 16px',
                height: '32px',
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
              New Client
            </button>

            {/* New Case — dark fill */}
            <button
              onClick={() => setShowNewCase(true)}
              style={{
                background: '#0F0F0E',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0 16px',
                height: '32px',
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 2v12M2 8h12" />
              </svg>
              New Case
            </button>
          </div>
        </div>

        {/* ── PAGE BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
          <h1
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: '#0F0F0E',
              marginBottom: '4px',
              marginTop: 0,
            }}
          >
            Cases
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: '#6B6B68',
              marginBottom: '24px',
              marginTop: 0,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {filter === 'all'
              ? `${cases.length} total`
              : `${filtered.length} ${filter} of ${cases.length} total`}
          </p>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '99px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  background: filter === f ? '#0F0F0E' : '#EFEDE8',
                  color: filter === f ? '#ffffff' : '#6B6B68',
                  transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Case list */}
          {loading ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                color: '#9A9A96',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Loading cases…
            </div>
          ) : error ? (
            <div
              style={{
                background: '#FFF0EE',
                border: '1px solid #FFBDBA',
                borderRadius: '14px',
                padding: '20px 24px',
                color: '#A0281A',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <strong>Error:</strong> {error}{' '}
              <button
                onClick={loadAll}
                style={{
                  marginLeft: '12px',
                  color: '#A0281A',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13.5px',
                }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '14px',
                padding: '48px',
                textAlign: 'center',
                color: '#9A9A96',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {filter === 'all' ? (
                <>
                  No cases yet.{' '}
                  <button
                    onClick={() => setShowNewCase(true)}
                    style={{
                      color: '#1A4FBF',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '13.5px',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    Create your first case →
                  </button>
                </>
              ) : (
                `No ${filter} cases.`
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(c => (
                <CaseRow key={c.id} c={c} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── NEW CASE MODAL ── */}
      {showNewCase && (
        <Modal title="New Case" onClose={() => { setShowNewCase(false); setCaseError('') }}>
          <form onSubmit={handleCreateCase}>
            {caseError && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                background: '#FFE8E6', color: '#A0281A', border: '1px solid #FFBDBA',
                fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              }}>
                ⚠ {caseError}
              </div>
            )}
            <InputField
              label="Case Title"
              value={newCaseTitle}
              onChange={setNewCaseTitle}
              placeholder="e.g. Chen v. Meridian Corp"
              required
            />
            <SelectField
              label="Practice Area"
              value={newCasePracticeArea}
              onChange={setNewCasePracticeArea}
            >
              <option value="">Select practice area…</option>
              {PRACTICE_AREAS.filter(Boolean).map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </SelectField>
            <SelectField
              label="Client"
              value={newCaseClientId}
              onChange={setNewCaseClientId}
            >
              <option value="">Select client…</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}{client.company ? ` (${client.company})` : ''}
                </option>
              ))}
            </SelectField>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowNewCase(false)}
                style={{
                  height: '38px',
                  background: 'none',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: '10px',
                  padding: '0 20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#6B6B68',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCase}
                style={{
                  height: '38px',
                  background: savingCase ? '#9A9A96' : '#0F0F0E',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingCase ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'background 0.18s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {savingCase ? 'Creating…' : 'Create Case'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── NEW CLIENT MODAL ── */}
      {showNewClient && (
        <Modal title="New Client" onClose={() => { setShowNewClient(false); setClientError('') }}>
          <form onSubmit={handleCreateClient}>
            {clientError && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                background: '#FFE8E6', color: '#A0281A', border: '1px solid #FFBDBA',
                fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              }}>
                ⚠ {clientError}
              </div>
            )}
            <InputField
              label="Full Name"
              value={newClientName}
              onChange={setNewClientName}
              placeholder="e.g. Sarah Chen"
              required
            />
            <InputField
              label="Email"
              value={newClientEmail}
              onChange={setNewClientEmail}
              placeholder="client@example.com"
              type="email"
            />
            <InputField
              label="Phone"
              value={newClientPhone}
              onChange={setNewClientPhone}
              placeholder="+1 (555) 000-0000"
              type="tel"
            />
            <InputField
              label="Company / Organization"
              value={newClientCompany}
              onChange={setNewClientCompany}
              placeholder="e.g. Meridian Corp"
            />
            <TextareaField
              label="Notes"
              value={newClientNotes}
              onChange={setNewClientNotes}
              placeholder="Any relevant details about this client…"
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowNewClient(false)}
                style={{
                  height: '38px',
                  background: 'none',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: '10px',
                  padding: '0 20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#6B6B68',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingClient}
                style={{
                  height: '38px',
                  background: savingClient ? '#9A9A96' : '#0F0F0E',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingClient ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'background 0.18s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {savingClient ? 'Saving…' : 'Add Client'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
