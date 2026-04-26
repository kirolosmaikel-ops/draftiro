'use client'

import { Suspense, useEffect, useRef, useState, useCallback, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Memoized markdown renderer.
// react-markdown re-parses the entire string on every prop change — when a
// chat reply is streaming, that's hundreds of re-parses per response. We
// memoize on content equality so React only re-renders when content really
// changes; combined with the auto-scroll change, this keeps the DOM cheap.
//
// Note: react-markdown blocks raw HTML by default. DO NOT add `rehype-raw`
// or `skipHtml={false}` here without first sanitizing with DOMPurify — that
// would re-introduce a stored-XSS vector via assistant output that mirrors
// user input.
const AssistantMarkdown = memo(function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
})

// Suggested follow-up prompts after the first assistant turn. Inspired by
// Perplexity / Claude.ai. Adapt copy to whether a case/doc is in context.
function makeSuggestions({ caseTitle, hasDoc }: { caseTitle?: string; hasDoc: boolean }): string[] {
  if (hasDoc) {
    return [
      'Summarize the key facts in 5 bullets',
      'What are the strongest arguments here?',
      'Find any potential weaknesses or counterarguments',
    ]
  }
  if (caseTitle) {
    return [
      `What's the typical statute of limitations for ${caseTitle}?`,
      'Draft an opening letter to opposing counsel',
      'List discovery requests I should serve',
    ]
  }
  return [
    'What\'s the difference between motion to dismiss and motion for summary judgment?',
    'Draft a standard NDA between two corporations',
    'Explain the elements of breach of contract in plain English',
  ]
}

// Inline kbd hint style used in chat input footer.
const kbdStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.04)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '4px',
  padding: '0 4px',
  fontSize: '10px',
  fontFamily: "'DM Sans', sans-serif",
  color: '#6B6B68',
}

// Format a chat bubble timestamp (e.g. 4:31 PM, or "Yesterday").
function formatMsgTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  createdAt?: string
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
  const initialDocId = searchParams.get('doc')
  const initialSessionId = searchParams.get('session')
  const initialPrompt = searchParams.get('prompt')

  // State
  const [cases, setCases] = useState<CaseRow[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedCase, setSelectedCase] = useState<string>(initialCaseId ?? '')
  const [selectedDoc, setSelectedDoc] = useState<string>(initialDocId ?? '')
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [draftInput, setDraftInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showDraft, setShowDraft] = useState(false)
  const [showCaseDD, setShowCaseDD] = useState(false)
  const [showDocDD, setShowDocDD] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionWasNewRef = useRef(false)

  // Session list (left rail)
  type SessionRow = { id: string; title: string | null; case_id: string | null; document_id: string | null; updated_at: string }
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [showSessions, setShowSessions] = useState(true)
  const [historyError, setHistoryError] = useState('')
  type StreamPhase = 'idle' | 'searching' | 'reading' | 'drafting'
  const [streamPhase, setStreamPhase] = useState<StreamPhase>('idle')
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])

  // ── Load cases ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('cases').select('id,title,status').order('updated_at', { ascending: false })
      .then(({ data }) => {
        setCases(data ?? [])
        if (!selectedCase && data?.length) setSelectedCase(data[0].id)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load chat session list (most recent 30 across firm) ────────────────
  async function refreshSessions() {
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, title, case_id, document_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(30)
    setSessions(data ?? [])
  }
  useEffect(() => { refreshSessions() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load message history when sessionId changes (URL-driven) ───────────
  useEffect(() => {
    if (!sessionId) { setMessages([]); setHistoryError(''); return }
    (async () => {
      setHistoryError('')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
        const res = await fetch(`/api/chat/query?sessionId=${sessionId}`, { headers })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setHistoryError(j.error ?? `Could not load conversation (${res.status}).`)
          setMessages([])
          return
        }
        const json = await res.json() as { messages: { id: string; role: string; content: string; citations?: Citation[] }[] }
        setMessages(
          (json.messages ?? []).map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            citations: m.citations,
          }))
        )
      } catch (e: unknown) {
        setHistoryError(e instanceof Error ? e.message : 'Network error loading conversation.')
        setMessages([])
      }
    })()
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

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
  // Use 'auto' (instant) while a response is streaming — 'smooth' triggers
  // an animation per token that constantly cancels and restarts, causing
  // jank. Switch to 'smooth' only when streaming finishes.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: streaming ? 'auto' : 'smooth',
    })
  }, [messages, streaming])

  // ── Abort any in-flight stream on unmount / nav-away ────────────────────
  useEffect(() => () => { abortRef.current?.abort() }, [])

  // ── Auto-send a `?prompt=` arrived from the dashboard quick-chat input ──
  const promptFiredRef = useRef(false)
  useEffect(() => {
    if (promptFiredRef.current) return
    if (!initialPrompt) return
    promptFiredRef.current = true
    setInput(initialPrompt)
    // Drop the param from the URL so a refresh doesn't re-fire it
    window.history.replaceState(null, '', '/chat')
    setTimeout(() => sendMessage(), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt])

  // ── Close dropdowns on outside click ─────────────────────────────────────
  // Use 'click' (not 'mousedown') so React's onClick on the dropdown items
  // fires FIRST in the bubble path. Previously the document mousedown handler
  // closed and unmounted the dropdown before the item's click could register,
  // making the case selector silently non-functional.
  useEffect(() => {
    const handler = () => { setShowCaseDD(false); setShowDocDD(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function ensureSession() {
    if (sessionId) return sessionId
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: userData } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
    // Title from first user message would be ideal but we don't have it yet —
    // the first user line will be the start of `input`. Store first 60 chars.
    const titleSeed = (input || 'New chat').slice(0, 60)
    const { data, error } = await supabase.from('chat_sessions').insert({
      firm_id: userData?.firm_id,
      user_id: user.id,
      case_id: selectedCase || null,
      document_id: selectedDoc || null,
      title: titleSeed,
    }).select('id').single()
    if (error || !data) return null
    setSessionId(data.id)
    sessionWasNewRef.current = true
    window.history.replaceState(null, '', `/chat?session=${data.id}`)
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

    const now = new Date().toISOString()
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text, createdAt: now }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setStreamPhase('searching')
    setSuggestedPrompts([])

    const sid = await ensureSession()
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString() }])

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
                if (fullText.length === 0) setStreamPhase('drafting')
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
      setStreamPhase('idle')
      // Refresh session list ONLY if a new session was just created
      // (otherwise the list order didn't change in any user-visible way).
      // wasNewSession is set inside ensureSession when the insert succeeds.
      if (sessionWasNewRef.current) {
        sessionWasNewRef.current = false
        refreshSessions()
      }
      // Generate suggested follow-ups after the first assistant turn (no doc
      // dependency — these are general legal-AI prompts that map to the
      // current case if any).
      setSuggestedPrompts(makeSuggestions({
        caseTitle: cases.find(c => c.id === selectedCase)?.title,
        hasDoc: !!selectedDoc,
      }))
    }
  }, [input, streaming, selectedDoc, selectedCase, sessionId, cases]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === 'Escape' && streaming) { e.preventDefault(); abortRef.current?.abort() }
  }

  // Regenerate the last assistant reply by removing it from the message list
  // and re-running sendMessage with the previous user message as input.
  function regenerateLast() {
    if (streaming) return
    // Find the last user message
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    // Drop trailing assistant messages
    setMessages(prev => {
      const lastUserIdx = [...prev].reverse().findIndex(m => m.role === 'user')
      if (lastUserIdx < 0) return prev
      const cutFrom = prev.length - lastUserIdx
      return prev.slice(0, cutFrom)
    })
    setInput(lastUser.content)
    setTimeout(() => sendMessage(), 0)
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
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
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
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
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

        {/* Right: export buttons + draft toggle. Exports require a doc. */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => exportDoc('docx')}
            disabled={!selectedDoc}
            title={selectedDoc ? 'Export as Word document' : 'Select a document first'}
            style={{
              height: '30px', background: surf2, border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
              cursor: selectedDoc ? 'pointer' : 'not-allowed',
              fontSize: '12px', fontWeight: 500, color: selectedDoc ? blue : ink4,
              opacity: selectedDoc ? 1 : 0.5,
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="1" width="9" height="14" rx="1" /><path d="M11 4h3l-3 4h3" /></svg>
            .docx
          </button>
          <button
            onClick={() => exportDoc('pdf')}
            disabled={!selectedDoc}
            title={selectedDoc ? 'Export as PDF' : 'Select a document first'}
            style={{
              height: '30px', background: surf2, border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
              cursor: selectedDoc ? 'pointer' : 'not-allowed',
              fontSize: '12px', fontWeight: 500,
              color: selectedDoc ? '#A0281A' : ink4,
              opacity: selectedDoc ? 1 : 0.5,
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="1" width="12" height="14" rx="1" /><path d="M5 6h6M5 9h6M5 12h4" /></svg>
            .pdf
          </button>
          <div style={{ width: '1px', height: '16px', background: hair, margin: '0 4px' }} />
          <button
            onClick={() => setShowSessions(p => !p)}
            title="Toggle past conversations panel"
            style={{
              background: 'none', border: `1px solid ${hair}`, borderRadius: rMd,
              padding: '0 12px', height: '30px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              color: showSessions ? ink : ink3, display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="1" y="2" width="5" height="12" rx="1" />
              <rect x="8" y="2" width="7" height="12" rx="1" />
            </svg>
            Conversations
          </button>
          <button
            onClick={() => {
              setSessionId(null)
              setMessages([])
              setInput('')
              window.history.replaceState(null, '', '/chat')
            }}
            title="Start a new chat"
            style={{
              background: '#0F0F0E', color: '#fff', border: 'none', borderRadius: rMd,
              padding: '0 12px', height: '30px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '5px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 2v12M2 8h12" /></svg>
            New
          </button>
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

      {/* ── MAIN LAYOUT — auto-collapse session rail at narrow widths so the
          chat column never gets clipped when Draft is also open. ────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minWidth: 0 }}>

        {/* ── SESSIONS RAIL ─────────────────────────────────────────────── */}
        {showSessions && (
          <div className="chat-sessions-rail" style={{
            width: '240px', flexShrink: 0,
            borderRight: `1px solid ${hair}`,
            background: surf,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${hair}`,
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: ink3,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Past Conversations
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
              {sessions.length === 0 ? (
                <div style={{ padding: '20px 16px', fontSize: '12px', color: ink3, lineHeight: 1.5 }}>
                  No past conversations yet. Start chatting and they&apos;ll appear here, grouped by case.
                </div>
              ) : (
                sessions.map(s => {
                  const caseLabel = s.case_id
                    ? cases.find(c => c.id === s.case_id)?.title ?? 'Untitled case'
                    : 'No case'
                  const isActive = s.id === sessionId
                  const when = new Date(s.updated_at)
                  const sameDay = when.toDateString() === new Date().toDateString()
                  const label = sameDay
                    ? when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    : when.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSessionId(s.id)
                        if (s.case_id) setSelectedCase(s.case_id)
                        if (s.document_id) setSelectedDoc(s.document_id)
                        window.history.replaceState(null, '', `/chat?session=${s.id}`)
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        background: isActive ? 'rgba(15,15,14,0.06)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'block',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <div style={{
                        fontSize: '12.5px', fontWeight: 600, color: ink,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {s.title ?? 'Untitled chat'}
                      </div>
                      <div style={{
                        fontSize: '10.5px', color: ink3, marginTop: '2px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {caseLabel} · {label}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

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
            {historyError && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', marginBottom: '14px',
                background: '#FFE8E6', color: '#A0281A', border: '1px solid #FFBDBA',
                fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
              }}>
                ⚠ {historyError}
              </div>
            )}
            {/* Welcome — adaptive headline + 3 example prompts */}
            {messages.length === 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
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
                      ? `Ready. I've loaded "${selectedDocName}" — ask me anything and I'll cite specific pages.`
                      : selectedCase
                        ? `Ready. I have full context on "${selectedCaseObj?.title ?? 'this case'}". Ask me anything.`
                        : `Hi — I'm your legal research assistant. Pick a case or document for grounded answers, or just ask a general question below.`}
                  </div>
                </div>
                {/* Example prompts */}
                <div style={{ marginLeft: '38px', display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '440px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ink4, marginBottom: '4px' }}>
                    Try asking
                  </div>
                  {makeSuggestions({
                    caseTitle: selectedCaseObj?.title,
                    hasDoc: !!selectedDoc,
                  }).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(prompt); setTimeout(() => sendMessage(), 0) }}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        background: '#FFFFFF',
                        border: `1px solid ${hair}`,
                        borderRadius: rMd,
                        fontSize: '12.5px',
                        color: ink,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'background 0.12s ease, border-color 0.12s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#F7F6F3'
                        e.currentTarget.style.borderColor = '#C8C8C4'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#FFFFFF'
                        e.currentTarget.style.borderColor = hair
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, idx) => {
              const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1 && !streaming
              return (
              <div
                key={msg.id}
                className="chat-msg-row"
                style={{
                  display: 'flex', gap: '10px', marginBottom: '20px',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
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

                {/* Bubble + actions wrapper */}
                <div style={{
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div
                    title={formatMsgTime(msg.createdAt)}
                    style={{
                      padding: '11px 14px',
                      borderRadius: msg.role === 'user'
                        ? `${rLg} 4px ${rLg} ${rLg}`
                        : `4px ${rLg} ${rLg} ${rLg}`,
                      background: msg.role === 'user' ? ink : surf2,
                      fontSize: '13.5px', lineHeight: 1.6,
                      color: msg.role === 'user' ? surf : ink,
                    }}
                  >
                  {/* Typing indicator (with stage label) OR content */}
                  {msg.role === 'assistant' && !msg.content ? (
                    <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        {[0, 200, 400].map(delay => (
                          <span key={delay} style={{
                            width: '6px', height: '6px', borderRadius: '50%', background: ink4,
                            display: 'inline-block',
                            animation: 'bounce 1.2s infinite ease-in-out',
                            animationDelay: `${delay}ms`,
                          }} />
                        ))}
                      </span>
                      <span style={{ fontSize: '12px', color: ink4, fontStyle: 'italic' }}>
                        {streamPhase === 'searching' ? 'Searching documents…'
                          : streamPhase === 'reading' ? 'Reading sources…'
                          : streamPhase === 'drafting' ? 'Drafting…'
                          : 'Thinking…'}
                      </span>
                    </span>
                  ) : msg.role === 'assistant' ? (
                    <AssistantMarkdown content={msg.content} />
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

                  {/* Hover actions (timestamp + copy + regenerate) */}
                  {msg.content && (
                    <div className="msg-actions" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '4px',
                      fontSize: '11px',
                      color: ink4,
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                    }}>
                      <span>{formatMsgTime(msg.createdAt)}</span>
                      {msg.role === 'assistant' && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                            title="Copy message"
                            style={{
                              background: 'none', border: 'none', padding: '2px 4px',
                              fontSize: '11px', color: ink3, cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Copy
                          </button>
                          {isLastAssistant && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <button
                                onClick={() => regenerateLast()}
                                title="Regenerate this response"
                                style={{
                                  background: 'none', border: 'none', padding: '2px 4px',
                                  fontSize: '11px', color: ink3, cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                              >
                                Regenerate
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${hair}`, flexShrink: 0 }}>
            {/* Suggested follow-ups (after first turn) */}
            {!streaming && suggestedPrompts.length > 0 && messages.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px',
              }}>
                {suggestedPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(p); setSuggestedPrompts([]); setTimeout(() => sendMessage(), 0) }}
                    style={{
                      padding: '6px 12px',
                      background: '#FFFFFF',
                      border: `1px solid ${hair}`,
                      borderRadius: '99px',
                      fontSize: '12px',
                      color: ink2,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'background 0.12s ease, border-color 0.12s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F7F6F3'; e.currentTarget.style.borderColor = '#C8C8C4' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = hair }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: '8px',
              background: surf2, border: `1.5px solid ${hair}`, borderRadius: rLg, padding: '10px 12px',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  // Auto-resize textarea
                  const t = e.target
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 200) + 'px'
                }}
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
                  resize: 'none', minHeight: '24px', maxHeight: '200px', lineHeight: 1.5,
                }}
              />
              {streaming ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  title="Stop generating"
                  style={{
                    width: '36px', height: '36px',
                    background: '#A0281A',
                    border: 'none',
                    borderRadius: rMd, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="white" width="13" height="13">
                    <rect x="3" y="3" width="10" height="10" rx="1.5" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  title="Send (Enter)"
                  style={{
                    width: '36px', height: '36px',
                    background: input.trim() ? '#0F0F0E' : '#C8C8C4',
                    border: 'none',
                    borderRadius: rMd, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" width="15" height="15">
                    <path d="M2 8h12M8 2l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
            {/* Hint + disclaimer below input */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '10.5px',
              color: ink4,
              marginTop: '8px',
              fontFamily: "'DM Sans', sans-serif",
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <span>
                <kbd style={kbdStyle}>Enter</kbd> to send · <kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>Enter</kbd> for newline{streaming && <> · <kbd style={kbdStyle}>Esc</kbd> to stop</>}
              </span>
              <span style={{ fontStyle: 'italic' }}>
                AI responses may contain errors. Not legal advice.
              </span>
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

          {/* Draft chat area — routes the message into the main chat thread
              and closes the panel so the user can see the response */}
          <div style={{ borderTop: `1px solid ${hair}`, padding: '12px', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: '8px',
              border: `1px solid ${hair}`, background: surf2, borderRadius: rMd,
              padding: '6px 8px',
            }}>
              <textarea
                value={draftInput}
                onChange={e => setDraftInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (draftInput.trim()) {
                      setInput(draftInput)
                      setDraftInput('')
                      setShowDraft(false)
                      setTimeout(() => sendMessage(), 0)
                    }
                  }
                }}
                placeholder="Ask AI to revise, expand, or cite…"
                rows={2}
                style={{
                  flex: 1, border: 'none', background: 'none',
                  fontSize: '12.5px', fontFamily: "'DM Sans', system-ui, sans-serif",
                  color: ink, outline: 'none', resize: 'none', minHeight: '38px',
                }}
              />
              <button
                onClick={() => {
                  if (!draftInput.trim()) return
                  setInput(draftInput)
                  setDraftInput('')
                  setShowDraft(false)
                  setTimeout(() => sendMessage(), 0)
                }}
                disabled={!draftInput.trim() || streaming}
                title="Send (Enter)"
                style={{
                  width: '32px', height: '32px',
                  background: draftInput.trim() && !streaming ? '#0F0F0E' : '#C8C8C4',
                  border: 'none', borderRadius: rMd,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: draftInput.trim() && !streaming ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2">
                  <path d="M2 8h12M8 2l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global keyframe animations + markdown styling */}
      <style>{`
        @keyframes bounce { 0%,80%,100% { transform:translateY(0) } 40% { transform:translateY(-6px) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
        .md-content > *:first-child { margin-top: 0; }
        .md-content > *:last-child  { margin-bottom: 0; }
        .md-content p { margin: 0 0 8px; }
        .md-content h1, .md-content h2, .md-content h3 { margin: 12px 0 6px; font-weight: 600; line-height: 1.3; }
        .md-content h1 { font-size: 16px; }
        .md-content h2 { font-size: 15px; }
        .md-content h3 { font-size: 14px; }
        .md-content ul, .md-content ol { margin: 4px 0 8px; padding-left: 22px; }
        .md-content li { margin: 2px 0; }
        .md-content code { background: #F7F6F3; border: 1px solid rgba(0,0,0,0.08); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
        .md-content pre { background: #F7F6F3; border: 1px solid rgba(0,0,0,0.08); padding: 10px 12px; border-radius: 8px; overflow-x: auto; margin: 6px 0; }
        .md-content pre code { background: none; border: none; padding: 0; font-size: 12px; }
        .md-content blockquote { border-left: 3px solid #C9A84C; padding-left: 10px; margin: 6px 0; color: #3A3A38; }
        .md-content a { color: #1A4FBF; text-decoration: underline; }
        .md-content table { border-collapse: collapse; margin: 6px 0; }
        .md-content th, .md-content td { border: 1px solid rgba(0,0,0,0.1); padding: 4px 8px; font-size: 12px; }
        /* Auto-hide the conversation rail at narrow widths so the chat
           column doesn't get clipped when the draft panel is also open. */
        @media (max-width: 1100px) {
          .chat-sessions-rail { display: none !important; }
        }
        .chat-msg-row:hover .msg-actions { opacity: 1 !important; }
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
