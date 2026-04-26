'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Cmd/Ctrl + K command palette. Lets the user jump anywhere or search past
 * cases / chats / drafts. Modeled on Linear / Raycast / Vercel.
 */

interface SearchHit {
  type: 'case' | 'chat' | 'draft' | 'document' | 'nav'
  id: string
  title: string
  subtitle?: string
  href: string
}

const NAV_ITEMS: SearchHit[] = [
  { type: 'nav', id: 'nav-dashboard', title: 'Go to Dashboard', href: '/dashboard' },
  { type: 'nav', id: 'nav-cases',     title: 'Go to Cases',     href: '/cases' },
  { type: 'nav', id: 'nav-chat',      title: 'Open Chat',       href: '/chat' },
  { type: 'nav', id: 'nav-knowledge', title: 'Go to Knowledge Base', href: '/knowledge' },
  { type: 'nav', id: 'nav-editor',    title: 'Open Draft Editor', href: '/editor' },
  { type: 'nav', id: 'nav-billing',   title: 'Go to Billing',   href: '/billing' },
  { type: 'nav', id: 'nav-settings',  title: 'Open Settings',   href: '/settings' },
  { type: 'nav', id: 'nav-newchat',   title: 'New Chat',        href: '/chat?session=' },
]

const TYPE_LABEL: Record<SearchHit['type'], string> = {
  case: 'Case', chat: 'Chat', draft: 'Draft', document: 'Document', nav: 'Go to',
}

export function CommandPalette() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard: Cmd/Ctrl+K toggles
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search Supabase as the user types (debounced)
  useEffect(() => {
    if (!open) { setHits(NAV_ITEMS); return }
    const q = query.trim()
    if (!q) { setHits(NAV_ITEMS); return }

    let cancelled = false
    const t = setTimeout(async () => {
      const ilike = `%${q}%`
      const [casesR, sessionsR, draftsR, docsR] = await Promise.all([
        supabase.from('cases').select('id, title, status').ilike('title', ilike).limit(5),
        supabase.from('chat_sessions').select('id, title, updated_at').ilike('title', ilike).order('updated_at', { ascending: false }).limit(5),
        supabase.from('drafts').select('id, title, updated_at').ilike('title', ilike).order('updated_at', { ascending: false }).limit(5),
        supabase.from('documents').select('id, name').ilike('name', ilike).limit(5),
      ])
      if (cancelled) return
      const out: SearchHit[] = []
      ;(casesR.data ?? []).forEach(c => out.push({
        type: 'case', id: c.id, title: c.title, subtitle: c.status, href: `/cases`,
      }))
      ;(sessionsR.data ?? []).forEach(s => out.push({
        type: 'chat', id: s.id, title: s.title ?? 'Untitled chat',
        subtitle: new Date(s.updated_at).toLocaleDateString(),
        href: `/chat?session=${s.id}`,
      }))
      ;(draftsR.data ?? []).forEach(d => out.push({
        type: 'draft', id: d.id, title: d.title ?? 'Untitled draft',
        subtitle: new Date(d.updated_at).toLocaleDateString(),
        href: '/editor',
      }))
      ;(docsR.data ?? []).forEach(d => out.push({
        type: 'document', id: d.id, title: d.name,
        href: `/chat?doc=${d.id}`,
      }))
      // Plus matching nav items
      NAV_ITEMS.filter(n => n.title.toLowerCase().includes(q.toLowerCase())).forEach(n => out.push(n))
      setHits(out)
      setActive(0)
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function go(h: SearchHit) {
    setOpen(false)
    router.push(h.href)
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (hits[active]) go(hits[active]) }
  }

  const grouped = useMemo(() => {
    const groups: Record<string, SearchHit[]> = {}
    hits.forEach(h => {
      const k = TYPE_LABEL[h.type]
      if (!groups[k]) groups[k] = []
      groups[k].push(h)
    })
    return groups
  }, [hits])

  if (!open) return null

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,15,14,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'cp-fade 0.12s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '600px', margin: '0 16px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.24), 0 6px 16px rgba(0,0,0,0.10)',
          border: '1px solid rgba(0,0,0,0.07)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '70vh',
          fontFamily: 'DM Sans, system-ui, sans-serif',
        }}
      >
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 18px' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9A9A96" strokeWidth="2" style={{ marginRight: '10px' }}>
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l4 4" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search cases, chats, drafts, documents… or jump to a page"
            style={{
              flex: 1, height: '52px', border: 'none', outline: 'none',
              fontSize: '15px', fontFamily: 'inherit', color: '#0F0F0E',
              background: 'transparent',
            }}
          />
          <kbd style={{
            background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '5px', padding: '2px 6px', fontSize: '10.5px', color: '#6B6B68',
          }}>ESC</kbd>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {hits.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9A9A96', fontSize: '13.5px' }}>
              No matches.
            </div>
          ) : (
            Object.entries(grouped).map(([groupName, items]) => (
              <div key={groupName} style={{ marginBottom: '4px' }}>
                <div style={{
                  padding: '8px 18px 4px',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#9A9A96',
                }}>
                  {groupName}
                </div>
                {items.map(h => {
                  const idx = hits.indexOf(h)
                  const isActive = idx === active
                  return (
                    <div
                      key={h.id}
                      onClick={() => go(h)}
                      onMouseEnter={() => setActive(idx)}
                      style={{
                        padding: '9px 18px',
                        background: isActive ? 'rgba(15,15,14,0.06)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13.5px', color: '#0F0F0E',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {h.title}
                        </div>
                        {h.subtitle && (
                          <div style={{ fontSize: '11.5px', color: '#9A9A96', marginTop: '1px' }}>
                            {h.subtitle}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <kbd style={{
                          background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '5px', padding: '2px 6px', fontSize: '10.5px', color: '#6B6B68',
                        }}>↵</kbd>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div style={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '8px 18px',
          fontSize: '11px',
          color: '#9A9A96',
          display: 'flex', gap: '12px',
        }}>
          <span><kbd style={cpKbd}>↑</kbd><kbd style={cpKbd}>↓</kbd> Navigate</span>
          <span><kbd style={cpKbd}>↵</kbd> Open</span>
          <span style={{ marginLeft: 'auto' }}>
            <kbd style={cpKbd}>⌘</kbd><kbd style={cpKbd}>K</kbd> to toggle
          </span>
        </div>
      </div>
      <style>{`@keyframes cp-fade { from { opacity:0 } to { opacity: 1 } }`}</style>
    </div>
  )
}

const cpKbd: React.CSSProperties = {
  background: 'rgba(0,0,0,0.05)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '4px',
  padding: '0 5px',
  fontSize: '10px',
  marginRight: '4px',
  color: '#6B6B68',
}
