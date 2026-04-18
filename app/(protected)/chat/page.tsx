'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

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
interface Case {
  id: string
  title: string
}

function ChatPageInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialCaseId = searchParams.get('case')

  const [cases, setCases] = useState<Case[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedCase, setSelectedCase] = useState<string>(initialCaseId ?? '')
  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showDraft, setShowDraft] = useState(false)
  const [showCaseDD, setShowCaseDD] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load cases
  useEffect(() => {
    supabase.from('cases').select('id,title').order('updated_at', { ascending: false })
      .then(({ data }) => {
        setCases(data ?? [])
        if (!selectedCase && data?.length) setSelectedCase(data[0].id)
      })
  }, [])

  // Load docs when case changes
  useEffect(() => {
    if (!selectedCase) return
    supabase.from('documents').select('id,name,status,case_id')
      .eq('case_id', selectedCase).order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocs(data ?? [])
        if (data?.length) setSelectedDoc(data[0].id)
      })
  }, [selectedCase])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sid, documentId: selectedDoc, caseId: selectedCase }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(await res.text())
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
        setMessages(prev => prev.map(m => m.id === assistantId
          ? { ...m, content: 'Sorry, an error occurred. Please try again.' }
          : m))
      }
    } finally {
      setStreaming(false)
    }
  }, [input, streaming, selectedDoc, selectedCase, sessionId])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const selectedCaseName = cases.find(c => c.id === selectedCase)?.title ?? 'Select case'
  const selectedDocName = docs.find(d => d.id === selectedDoc)?.name ?? 'No document'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        height: '52px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '12px', flexShrink: 0, position: 'relative',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>Document Chat</span>
        <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.07)' }} />

        {/* Case dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowCaseDD(p => !p)} style={{
            height: '30px', background: '#F7F6F3', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px',
            padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontSize: '12.5px', fontWeight: 500, color: '#1D1D1F', fontFamily: 'Manrope, sans-serif', minWidth: '180px',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9A96' }}>Case</span>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCaseName}</span>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><path d="M2 4l4 4 4-4" /></svg>
          </button>
          {showCaseDD && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '220px',
              background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 100, overflow: 'hidden',
            }}>
              {cases.map(c => (
                <div key={c.id} onClick={() => { setSelectedCase(c.id); setShowCaseDD(false) }} style={{
                  padding: '9px 14px', fontSize: '13px', color: '#3A3A38', cursor: 'pointer',
                  background: c.id === selectedCase ? '#F7F6F3' : '#fff', fontWeight: c.id === selectedCase ? 600 : 400,
                }}>
                  {c.title}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowDraft(p => !p)}
            style={{
              background: 'none', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px',
              padding: '0 12px', height: '30px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              color: showDraft ? '#1D1D1F' : '#6B6B68', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '5px',
            }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 14l2-2 8-8 2 2-8 8-2 2z" /></svg>
            Draft
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Doc viewer */}
        <div style={{ width: showDraft ? '42%' : '50%', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', background: '#fff', transition: 'width 0.25s ease' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedDocName}
            </div>
            {docs.length > 1 && (
              <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} style={{
                fontSize: '12px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '6px',
                padding: '3px 8px', fontFamily: 'Manrope, sans-serif', background: '#F7F6F3', color: '#1D1D1F', outline: 'none',
              }}>
                {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', background: '#F7F6F3' }}>
            {docs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#9A9A96' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>No documents in this case</div>
                <div style={{ fontSize: '12px' }}>Upload a document to start chatting</div>
              </div>
            ) : (
              <div style={{
                background: '#fff', borderRadius: '10px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                minHeight: '700px', padding: '64px 56px',
              }}>
                <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6B6B68', marginBottom: '4px' }}>
                    Document Viewer
                  </div>
                  <div style={{ fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 300, color: '#1D1D1F' }}>
                    {selectedDocName}
                  </div>
                </div>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: '13.5px', lineHeight: 1.8, color: '#3A3A38' }}>
                  <p>Document is indexed and ready for AI chat. Ask questions in the chat panel to extract insights, find specific information, and get cited answers from this document.</p>
                  <p style={{ marginTop: '16px' }}>Use the chat panel on the right to interact with this document&apos;s contents.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>AI Document Assistant</span>
            <span style={{ background: '#F5EDD8', color: '#8B6914', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: '99px' }}>Grounded</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>AI</div>
                <div style={{ maxWidth: '75%', padding: '11px 14px', borderRadius: '4px 14px 14px 14px', background: '#F7F6F3', fontSize: '13.5px', lineHeight: 1.6, color: '#1D1D1F' }}>
                  {selectedDoc
                    ? `I've loaded the document. Ask me anything — I'll cite exact page references for every answer.`
                    : 'Select a case and document above to start chatting. I\'ll answer questions grounded only in your documents.'}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700,
                  background: msg.role === 'user' ? '#F5EDD8' : '#1D1D1F',
                  color: msg.role === 'user' ? '#8B6914' : '#fff',
                }}>
                  {msg.role === 'user' ? 'You' : 'AI'}
                </div>
                <div style={{
                  maxWidth: '75%', padding: '11px 14px',
                  borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  background: msg.role === 'user' ? '#1D1D1F' : '#F7F6F3',
                  fontSize: '13.5px', lineHeight: 1.6,
                  color: msg.role === 'user' ? '#fff' : '#1D1D1F',
                }}>
                  {msg.content || (
                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 200, 400].map(delay => (
                        <span key={delay} style={{
                          width: '6px', height: '6px', borderRadius: '50%', background: '#9A9A96',
                          display: 'inline-block',
                          animation: 'bounce 1.2s infinite ease-in-out',
                          animationDelay: `${delay}ms`,
                        }} />
                      ))}
                    </span>
                  )}
                  {msg.citations?.map((c, i) => (
                    <span key={i} style={{
                      display: 'inline-block', background: '#F5EDD8', color: '#8B6914',
                      fontSize: '11.5px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px',
                      marginLeft: '6px', cursor: 'pointer',
                    }}>
                      Page {c.page}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: '8px',
              background: '#F7F6F3', border: '1.5px solid rgba(0,0,0,0.07)',
              borderRadius: '14px', padding: '10px 12px',
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={selectedDoc ? 'Ask a question about this document…' : 'Select a document first…'}
                disabled={!selectedDoc || streaming}
                rows={1}
                style={{
                  flex: 1, border: 'none', background: 'none', outline: 'none',
                  fontSize: '13.5px', fontFamily: 'Manrope, sans-serif', color: '#1D1D1F',
                  resize: 'none', minHeight: '20px', maxHeight: '80px',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || !selectedDoc || streaming}
                style={{
                  width: '32px', height: '32px', background: '#1D1D1F', border: 'none',
                  borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() && selectedDoc && !streaming ? 'pointer' : 'not-allowed',
                  opacity: input.trim() && selectedDoc && !streaming ? 1 : 0.4, flexShrink: 0,
                }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" width="14" height="14">
                  <path d="M2 8h12M8 2l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Draft panel */}
        <div style={{
          width: showDraft ? '320px' : '0', overflow: 'hidden',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          background: '#fff', borderLeft: showDraft ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F', flex: 1 }}>Drafting Assistant</span>
            <button onClick={() => setShowDraft(false)} style={{ width: '24px', height: '24px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9A96', borderRadius: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13" /></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <p style={{ fontSize: '12.5px', color: '#9A9A96', lineHeight: 1.6 }}>
              Chat with your documents to extract insights, then use the editor to create drafts with AI-powered citations.
            </p>
            <a href="/editor" style={{
              display: 'inline-block', marginTop: '12px', fontSize: '12px', fontWeight: 600,
              color: '#1A4FBF', textDecoration: 'none', background: '#EEF3FF',
              padding: '6px 14px', borderRadius: '8px',
            }}>
              Open Draft Editor →
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100% { transform:translateY(0) } 40% { transform:translateY(-6px) } }
      `}</style>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9A96', fontSize: '13.5px' }}>
        Loading…
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  )
}
