'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────
interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}
interface Citation {
  page: number
  text: string
}
interface Doc {
  id: string
  name: string
  status: string
  case_id: string | null
}
interface CaseRow {
  id: string
  title: string
  status?: string
  document_count?: number
}

// ── Design tokens (inline — all from design system) ───────────────────────
const ink    = '#0F0F0E'
const ink2   = '#3A3A38'
const ink3   = '#6B6B68'
const ink4   = '#9A9A96'
const ink5   = '#C8C8C4'
const surf   = '#FFFFFF'
const surf2  = '#F7F6F3'
const gold   = '#8B6914'
const goldL  = '#F5EDD8'
const blue   = '#1A4FBF'
const hair   = 'rgba(0,0,0,0.07)'
const rSm    = '6px'
const rMd    = '10px'
const rLg    = '14px'

// ── Main inner component (needs useSearchParams → must be inside Suspense) ─
function ChatPageInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialCaseId = searchParams.get('case')

  // State
  const [cases, setCases] = useState<CaseRow[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedCase, setSelectedCase] = useState<string>(initialCaseId ?? '')
  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showDraft, setShowDraft] = useState(false)
  const [showCaseDD, setShowCaseDD] = useState(false)
  const [showDocDD, setShowDocDD] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load cases ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('cases').select('id,title,status').order('updated_at', { ascending: false })
      .then(({ data }) => {
        setCases(data ?? [])
        if (!selectedCase && data?.length) setSelectedCase(data[0].id)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load docs when case changes ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedCase) return
    supabase.from('documents')
      .select('id,name,status,case_id')
      .eq('case_id', selectedCase)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocs(data ?? [])
        if (data?.length) setSelectedDoc(data[0].id)
        else setSelectedDoc('')
      })
  }, [selectedCase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll document status every 3 s if not ready ───────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!selectedDoc) return

    const currentDocObj = docs.find(d => d.id === selectedDoc)
    if (!currentDocObj) return
    if (currentDocObj.status === 'indexed' || currentDocObj.status === 'ready') return

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/documents/status/${selectedDoc}`)
      if (!res.ok) return
      const data: Doc = await res.json()
      setDocs(prev => prev.map(d => d.id === selectedDoc ? { ...d, status: data.status } : d))
      if (data.status === 'indexed' || data.status === 'ready') {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedDoc, docs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = () => { setShowCaseDD(false); setShowDocDD(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function ensureSession() {
    if (sessionId) return sessionId
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: userData } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
    const { data, error } = await supabase.from('chat_sessions').insert({
      firm_id: userData?.firm_id,
      user_id: user.id,
      case_id: selectedCase || null,
      document_id: selectedDoc || null,
      title: `Chat ${new Date().toLocaleDateString()}`,
    }).select('id').single()
    if (error || !data) return null
    setSessionId(data.id)
    return data.id
  }

  const selectedCaseObj = cases.find(c => c.id === selectedCase)
  const selectedDocObj  = docs.find(d => d.id === selectedDoc)
  const selectedCaseName = selectedCaseObj?.title ?? 'Select case'
  const selectedDocName  = selectedDocObj?.name ?? 'No document'
  const docIsProcessing  = selectedDocObj && selectedDocObj.status !== 'indexed' && selectedDocObj.status !== 'ready'
  const docReady         = selectedDocObj && (selectedDocObj.status === 'indexed' || selectedDocObj.status === 'ready')

  // ── Export handlers ───────────────────────────────────────────────────────
  async function exportDoc(format: 'docx' | 'pdf') {
    if (!selectedDoc) return
    try {
      const res = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDoc, caseId: selectedCase }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedDocName}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('export error', e)
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)

    const sid = await ensureSession()
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      abortRef.current = new AbortController()
      // Pass current access token explicitly — cookie-based auth has been
      // unreliable in this project. See lib/auth-fetch.ts.
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          sessionId: sid,
          documentId: selectedDoc || undefined,
          caseId: selectedCase || undefined,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        let msg = `Request failed (${res.status})`
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
        } catch { /* not JSON */ }
        throw new Error(msg)
      }
      if (!res.body) throw new Error('No body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let citations: Citation[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6)
            if (raw === '[DONE]') continue
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'text') {
                fullText += parsed.content
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m))
              } else if (parsed.type === 'citations') {
                citations = parsed.citations
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, citations } : m))
              }
            } catch { /* partial chunk */ }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const msg = err.message || 'Something went wrong.'
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: `⚠ ${msg}` } : m
        ))
      }
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, selectedDoc, selectedCase, sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
      <div style={{
        height: '52px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${hair}`, display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '12px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: ink, letterSpacing: '-0.2px' }}>Document Chat</span>
        <div style={{ width: '1px', height: '16px', background: hair, margin: '0 4px' }} />

        {/* Case dropdown */}
        <div style={{ position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
          <div
            onClick={() => { setShowCaseDD(p => !p); setShowDocDD(false) }}
            style={{
              height: '30px', background: surf2, border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              fontSize: '12.5px', fontWeight: 500, color: ink, userSelect: 'none', minWidth: '170px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink4, marginRight: '2px' }}>Case</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCaseName}</span>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12" style={{ color: ink4, marginLeft: 'auto', flexShrink: 0 }}><path d="M2 4l4 4 4-4" /></svg>
          </div>
          {showCaseDD && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '220px',
              background: surf, border: `1px solid ${hair}`, borderRadius: rLg,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04)',
              zIndex: 100, overflow: 'hidden',
              animation: 'fadeDown 0.12s ease',
            }}>
              {cases.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: '13px', color: ink4 }}>No cases found</div>
              )}
              {cases.map(c => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCase(c.id); setShowCaseDD(false) }}
                  style={{
                    padding: '9px 14px', fontSize: '13px', cursor: 'pointer',
                    color: c.id === selectedCase ? ink : ink2,
                    fontWeight: c.id === selectedCase ? 500 : 400,
                    background: c.id === selectedCase ? surf2 : surf,
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div>{c.title}</div>
                    <div style={{ fontSize: '11px', color: ink4, marginTop: '1px' }}>
                      {c.status ?? 'Active'}
                    </div>
                  </div>
                  {c.id === selectedCase && <span style={{ color: gold, fontWeight: 700, fontSize: '13px' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document dropdown */}
        <div style={{ position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
          <div
            onClick={() => { setShowDocDD(p => !p); setShowCaseDD(false) }}
            style={{
              height: '30px', background: surf2, border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              fontSize: '12.5px', fontWeight: 500, color: ink, userSelect: 'none', minWidth: '170px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink4, marginRight: '2px' }}>Doc</span>
            {docIsProcessing && (
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#FF9F0A', flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {docIsProcessing ? 'Processing…' : selectedDocName}
            </span>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="12" height="12" style={{ color: ink4, marginLeft: 'auto', flexShrink: 0 }}><path d="M2 4l4 4 4-4" /></svg>
          </div>
          {showDocDD && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '220px',
              background: surf, border: `1px solid ${hair}`, borderRadius: rLg,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04)',
              zIndex: 100, overflow: 'hidden',
              animation: 'fadeDown 0.12s ease',
            }}>
              {docs.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: '13px', color: ink4 }}>No documents in this case</div>
              )}
              {docs.map(d => (
                <div
                  key={d.id}
                  onClick={() => { setSelectedDoc(d.id); setShowDocDD(false) }}
                  style={{
                    padding: '9px 14px', fontSize: '13px', cursor: 'pointer',
                    color: d.id === selectedDoc ? ink : ink2,
                    fontWeight: d.id === selectedDoc ? 500 : 400,
                    background: d.id === selectedDoc ? surf2 : surf,
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{d.name}</div>
                    <div style={{ fontSize: '11px', color: ink4, marginTop: '1px' }}>{d.status}</div>
                  </div>
                  {d.id === selectedDoc && <span style={{ color: gold, fontWeight: 700, fontSize: '13px' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: export buttons + draft toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => exportDoc('docx')}
            title="Export as Word document"
            style={{
              height: '30px', background: surf2, border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
              cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: blue,
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="1" width="9" height="14" rx="1" /><path d="M11 4h3l-3 4h3" /></svg>
            .docx
          </button>
          <button
            onClick={() => exportDoc('pdf')}
            title="Export as PDF"
            style={{
              height: '30px', background: surf2, border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
              cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: '#A0281A',
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="1" width="12" height="14" rx="1" /><path d="M5 6h6M5 9h6M5 12h4" /></svg>
            .pdf
          </button>
          <div style={{ width: '1px', height: '16px', background: hair, margin: '0 4px' }} />
          <button
            onClick={() => setShowDraft(p => !p)}
            style={{
              background: 'none', border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 12px', height: '30px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              color: showDraft ? ink : ink3, display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 14l2-2 8-8 2 2-8 8-2 2z" /></svg>
            Draft
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── DOC PANEL ─────────────────────────────────────────────────── */}
        <div style={{
          width: showDraft ? '42%' : '52%', borderRight: `1px solid ${hair}`,
          display: 'flex', flexDirection: 'column', background: surf,
          overflow: 'hidden', transition: 'width 0.25s ease', flexShrink: 0,
        }}>
          {/* Doc panel topbar */}
          <div style={{
            padding: '12px 20px', borderBottom: `1px solid ${hair}`,
            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
            flexWrap: 'wrap', background: surf,
          }}>
            <div style={{
              flex: 1, fontSize: '13px', fontWeight: 600, color: ink, letterSpacing: '-0.2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: '180px',
            }}>
              {selectedDocName}
            </div>
            {docReady && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: ink3, fontWeight: 500 }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    width: '24px', height: '24px', border: `1px solid ${hair}`, borderRadius: rSm,
                    background: surf2, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: ink3,
                  }}
                >‹</button>
                <span>Page {currentPage}</span>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{
                    width: '24px', height: '24px', border: `1px solid ${hair}`, borderRadius: rSm,
                    background: surf2, cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: ink3,
                  }}
                >›</button>
              </div>
            )}
          </div>

          {/* Doc viewer area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', background: surf2 }}>
            {docs.length === 0 ? (
              /* No documents placeholder */
              <div style={{ textAlign: 'center', padding: '80px 0', color: ink4 }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: ink2, marginBottom: '4px' }}>No documents in this case</div>
                <div style={{ fontSize: '12px' }}>Upload a document to start chatting</div>
              </div>
            ) : docIsProcessing ? (
              /* Processing spinner */
              <div style={{
                background: surf, borderRadius: rMd, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                minHeight: '700px', padding: '64px 56px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '16px',
              }}>
                <div style={{
                  width: '32px', height: '32px', border: `3px solid ${surf2}`,
                  borderTop: `3px solid ${ink3}`, borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <div style={{ fontSize: '13.5px', color: ink3 }}>Document is still processing, please wait…</div>
              </div>
            ) : (
              /* Document content */
              <div style={{
                background: surf, borderRadius: rMd, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                minHeight: '700px', padding: '64px 56px',
              }}>
                <div style={{
                  textAlign: 'center', marginBottom: '32px',
                  borderBottom: `1px solid ${hair}`, paddingBottom: '24px',
                }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em',
                    textTransform: 'uppercase', color: ink3, marginBottom: '4px',
                  }}>
                    Document Viewer
                  </div>
                  <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '18px', fontWeight: 300, color: ink }}>
                    {selectedDocName}
                  </div>
                  <div style={{ fontSize: '11px', color: ink4, marginTop: '4px' }}>
                    {selectedCaseName}
                  </div>
                </div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: '13.5px', lineHeight: 1.8, color: ink2 }}>
                  <p>Document is indexed and ready for AI chat. Ask questions in the chat panel to extract insights, find specific information, and get cited answers from this document.</p>
                  <p style={{ marginTop: '16px' }}>
                    <span style={{
                      background: '#FEF3C7', borderRadius: '3px', padding: '1px 2px',
                      borderBottom: `2px solid #C9A84C`, cursor: 'pointer',
                    }}>
                      Use the chat panel on the right to interact with this document&apos;s contents.
                    </span>
                  </p>
                  <p style={{ marginTop: '16px' }}>The AI assistant will provide grounded answers with exact citations to page numbers within this document.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CHAT PANEL ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: surf, overflow: 'hidden' }}>
          {/* Chat topbar */}
          <div style={{
            padding: '12px 20px', borderBottom: `1px solid ${hair}`,
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: ink }}>AI Document Assistant</span>
            <span style={{
              background: goldL, color: gold, fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.06em', padding: '2px 8px', borderRadius: '99px',
            }}>Grounded</span>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* Welcome message */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, color: surf, flexShrink: 0,
                }}>AI</div>
                <div style={{
                  maxWidth: '75%', padding: '11px 14px',
                  borderRadius: `4px ${rLg} ${rLg} ${rLg}`,
                  background: surf2, fontSize: '13.5px', lineHeight: 1.6, color: ink,
                }}>
                  {selectedDoc
                    ? `I've loaded the document. Ask me anything — I'll cite exact page references for every answer.`
                    : "Select a case and document above to start chatting. I'll answer questions grounded only in your documents."}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex', gap: '10px', marginBottom: '20px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700,
                  background: msg.role === 'user' ? goldL : ink,
                  color: msg.role === 'user' ? gold : surf,
                }}>
                  {msg.role === 'user' ? 'You' : 'AI'}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: '75%', padding: '11px 14px',
                  borderRadius: msg.role === 'user'
                    ? `${rLg} 4px ${rLg} ${rLg}`
                    : `4px ${rLg} ${rLg} ${rLg}`,
                  background: msg.role === 'user' ? ink : surf2,
                  fontSize: '13.5px', lineHeight: 1.6,
                  color: msg.role === 'user' ? surf : ink,
                }}>
                  {/* Typing indicator OR content */}
                  {msg.role === 'assistant' && !msg.content ? (
                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0' }}>
                      {[0, 200, 400].map(delay => (
                        <span key={delay} style={{
                          width: '6px', height: '6px', borderRadius: '50%', background: ink4,
                          display: 'inline-block',
                          animation: 'bounce 1.2s infinite ease-in-out',
                          animationDelay: `${delay}ms`,
                        }} />
                      ))}
                    </span>
                  ) : (
                    msg.content
                  )}

                  {/* Citation chips (after content) */}
                  {msg.citations && msg.citations.length > 0 && (
                    <span style={{ display: 'block', marginTop: '8px' }}>
                      {msg.citations.map((c, i) => (
                        <span key={i} style={{
                          display: 'inline-block', background: goldL, color: gold,
                          fontSize: '11.5px', fontWeight: 600, padding: '1px 7px',
                          borderRadius: '4px', marginLeft: i > 0 ? '4px' : '0',
                          marginBottom: '2px', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                          Page {c.page}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${hair}`, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: '8px',
              background: surf2, border: `1.5px solid ${hair}`, borderRadius: rLg, padding: '10px 12px',
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  selectedDoc
                    ? 'Ask a question about this document…'
                    : selectedCase
                      ? 'Ask anything about this case…'
                      : 'Ask a legal question — select a case or document for grounded answers'
                }
                disabled={streaming}
                rows={1}
                style={{
                  flex: 1, border: 'none', background: 'none', outline: 'none',
                  fontSize: '13.5px', fontFamily: "'DM Sans', system-ui, sans-serif", color: ink,
                  resize: 'none', minHeight: '20px', maxHeight: '80px',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                title="Send (Enter)"
                style={{
                  width: '36px', height: '36px',
                  background: input.trim() && !streaming ? '#0F0F0E' : '#C8C8C4',
                  border: 'none',
                  borderRadius: rMd, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() && !streaming ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                  transition: 'background 0.15s ease',
                }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" width="15" height="15">
                  <path d="M2 8h12M8 2l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── DRAFT PANEL ────────────────────────────────────────────────── */}
        <div style={{
          width: showDraft ? '340px' : '0', overflow: 'hidden',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          background: surf,
          borderLeft: showDraft ? `1px solid ${hair}` : '1px solid transparent',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Draft panel topbar */}
          <div style={{
            padding: '14px 18px', borderBottom: `1px solid ${hair}`,
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: ink, flex: 1 }}>Drafting Assistant</span>
            <button
              onClick={() => setShowDraft(false)}
              style={{
                width: '24px', height: '24px', border: 'none', background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: ink4, borderRadius: rSm,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>

          {/* Draft panel body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{
              background: surf2,
              borderRadius: rMd,
              padding: '28px 18px',
              border: `1px dashed ${hair}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '22px', marginBottom: '8px', lineHeight: 1 }}>📎</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: ink, marginBottom: '4px' }}>
                Draft assistant
              </div>
              <div style={{ fontSize: '11.5px', color: ink3, lineHeight: 1.5 }}>
                Citation insert and clause suggestions are coming soon.
                Use the chat to ask for a draft and copy what you need.
              </div>
            </div>
          </div>

          {/* Draft chat area */}
          <div style={{ borderTop: `1px solid ${hair}`, padding: '12px', flexShrink: 0 }}>
            <textarea
              placeholder="Ask AI to revise, expand, or cite…"
              rows={2}
              style={{
                width: '100%', border: `1px solid ${hair}`, background: surf2, borderRadius: rMd,
                padding: '8px 12px', fontSize: '12.5px', fontFamily: "'DM Sans', system-ui, sans-serif",
                color: ink, outline: 'none', resize: 'none', minHeight: '38px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Global keyframe animations */}
      <style>{`
        @keyframes bounce { 0%,80%,100% { transform:translateY(0) } 40% { transform:translateY(-6px) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </div>
  )
}

// ── Page export (Suspense wrapper required for useSearchParams) ────────────
export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9A9A96', fontSize: '13.5px', fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        Loading…
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  )
}
