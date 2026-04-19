'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

interface Draft {
  id: string
  title: string
  content: string
  updated_at: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ── Transition constant ────────────────────────────────────────────────────

const TR = '0.18s cubic-bezier(0.4,0,0.2,1)'

// ── Sample content for new drafts ─────────────────────────────────────────

const SAMPLE_CONTENT = `<p>Start writing your draft here…</p>`

// ── Component ──────────────────────────────────────────────────────────────

export default function EditorPage() {
  const supabase = createClient()
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // State
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null)
  const [title, setTitle] = useState('Untitled Document')
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [showPanel, setShowPanel] = useState(false)
  const [showExportDD, setShowExportDD] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Hover states
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
  const [hoveredDraft, setHoveredDraft] = useState<string | null>(null)

  // ── Load drafts on mount ─────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('drafts')
      .select('id,title,content,updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setDrafts(data ?? [])
        if (data?.length) {
          openDraft(data[0])
        }
      })
  }, [])

  // ── Close export dropdown on outside click ───────────────────────────────

  useEffect(() => {
    if (!showExportDD) return
    const close = () => setShowExportDD(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showExportDD])

  // ── Open a draft ─────────────────────────────────────────────────────────

  function openDraft(d: Draft) {
    setActiveDraft(d)
    setTitle(d.title)
    setContent(d.content)
    setSaveStatus('idle')
    if (editorRef.current) {
      editorRef.current.innerHTML = d.content || SAMPLE_CONTENT
    }
  }

  // ── New draft ────────────────────────────────────────────────────────────

  function newDraft() {
    setActiveDraft(null)
    setTitle('Untitled Document')
    setContent('')
    setSaveStatus('idle')
    if (editorRef.current) {
      editorRef.current.innerHTML = SAMPLE_CONTENT
    }
  }

  // ── Handle content change (debounce 2s auto-save) ────────────────────────

  function handleContentChange(val: string) {
    setContent(val)
    setSaveStatus('idle')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveDraft(val, title), 2000)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    setSaveStatus('idle')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveDraft(content, val), 2000)
  }

  // ── Save draft ───────────────────────────────────────────────────────────

  async function saveDraft(body = content, t = title) {
    setSaveStatus('saving')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveStatus('error'); return }

      if (activeDraft) {
        await fetch('/api/editor/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeDraft.id, title: t, content: body }),
        })
        setDrafts(prev =>
          prev.map(d => d.id === activeDraft.id
            ? { ...d, title: t, content: body, updated_at: new Date().toISOString() }
            : d
          )
        )
      } else {
        const res = await fetch('/api/editor/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, content: body }),
        })
        const json = await res.json()
        if (json.id) {
          const newD: Draft = { id: json.id, title: t, content: body, updated_at: new Date().toISOString() }
          setActiveDraft(newD)
          setDrafts(prev => [newD, ...prev])
        }
      }
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────

  async function exportDoc(format: 'docx' | 'pdf') {
    setExporting(true)
    setShowExportDD(false)
    const res = await fetch(`/api/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  // ── Toolbar formatting button ─────────────────────────────────────────────

  function ToolbarBtn({ id, label, command, value }: { id: string; label: string; command: string; value?: string }) {
    const isHov = hoveredBtn === id
    return (
      <button
        onMouseDown={e => { e.preventDefault(); document.execCommand(command, false, value) }}
        onMouseEnter={() => setHoveredBtn(id)}
        onMouseLeave={() => setHoveredBtn(null)}
        title={label}
        style={{
          width: '28px',
          height: '28px',
          border: 'none',
          background: isHov ? '#F7F6F3' : 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 700,
          color: isHov ? '#0F0F0E' : '#6B6B68',
          fontFamily: "'DM Sans', sans-serif",
          transition: TR,
          flexShrink: 0,
        }}
      >
        {label}
      </button>
    )
  }

  // ── Save status label ────────────────────────────────────────────────────

  function SaveLabel() {
    if (saveStatus === 'saving') {
      return <span style={{ fontSize: '11.5px', color: '#9A9A96', fontFamily: "'DM Sans', sans-serif" }}>Saving…</span>
    }
    if (saveStatus === 'saved') {
      return <span style={{ fontSize: '11.5px', color: '#1A7A4A', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Saved ✓</span>
    }
    if (saveStatus === 'error') {
      return <span style={{ fontSize: '11.5px', color: '#A0281A', fontFamily: "'DM Sans', sans-serif" }}>Save failed</span>
    }
    return null
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>

      {/* ── Toolbar ── */}
      <div style={{
        height: '46px',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '8px',
        flexShrink: 0,
        background: '#FFFFFF',
      }}>
        {/* Title */}
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled Document…"
          style={{
            border: 'none',
            background: 'none',
            outline: 'none',
            fontSize: '14px',
            fontWeight: 600,
            color: '#0F0F0E',
            fontFamily: "'DM Sans', sans-serif",
            flex: 1,
            minWidth: 0,
          }}
        />

        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.07)', margin: '0 4px', flexShrink: 0 }} />

        {/* Formatting buttons */}
        <ToolbarBtn id="bold" label="B" command="bold" />
        <ToolbarBtn id="italic" label="I" command="italic" />
        <ToolbarBtn id="underline" label="U" command="underline" />

        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.07)', margin: '0 4px', flexShrink: 0 }} />

        <ToolbarBtn id="h1" label="H1" command="formatBlock" value="h1" />
        <ToolbarBtn id="h2" label="H2" command="formatBlock" value="h2" />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SaveLabel />

          {/* Manual save button */}
          <button
            onClick={() => saveDraft()}
            onMouseEnter={() => setHoveredBtn('save')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              background: hoveredBtn === 'save' ? '#F7F6F3' : 'none',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: '10px',
              padding: '0 12px',
              height: '30px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              color: saveStatus === 'saved' ? '#1A7A4A' : '#3A3A38',
              borderColor: saveStatus === 'saved' ? 'rgba(26,122,74,0.25)' : 'rgba(0,0,0,0.07)',
              fontFamily: "'DM Sans', sans-serif",
              transition: TR,
            } as React.CSSProperties}
          >
            Save
          </button>

          {/* AI Panel toggle */}
          <button
            onClick={() => setShowPanel(p => !p)}
            onMouseEnter={() => setHoveredBtn('panel')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              background: showPanel ? '#0F0F0E' : (hoveredBtn === 'panel' ? '#F7F6F3' : 'none'),
              color: showPanel ? '#FFFFFF' : '#3A3A38',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: '10px',
              padding: '0 12px',
              height: '30px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: TR,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="8" cy="8" r="6" /><path d="M8 5v4M8 11v.5" />
            </svg>
            AI Panel
          </button>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setShowExportDD(p => !p) }}
              disabled={exporting}
              onMouseEnter={() => setHoveredBtn('export')}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                background: hoveredBtn === 'export' && !exporting ? '#F7F6F3' : 'none',
                color: '#3A3A38',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '10px',
                padding: '0 12px',
                height: '30px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                transition: TR,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: exporting ? 0.6 : 1,
              }}
            >
              {exporting ? 'Exporting…' : 'Export'}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 3.5l3 3 3-3" />
              </svg>
            </button>

            {showExportDD && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  minWidth: '180px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'fadeDown 0.12s ease',
                }}
              >
                <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }`}</style>
                <div
                  onClick={() => exportDoc('docx')}
                  style={{
                    padding: '9px 14px',
                    fontSize: '13px',
                    color: '#1A4FBF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: TR,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F3')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="1" width="9" height="14" rx="1" /><path d="M11 4h3l-3 4h3" />
                  </svg>
                  Export as .docx
                </div>
                <div
                  onClick={() => exportDoc('pdf')}
                  style={{
                    padding: '9px 14px',
                    fontSize: '13px',
                    color: '#A0281A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: TR,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F3')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="1" width="12" height="14" rx="1" /><path d="M5 6h6M5 9h6M5 12h4" />
                  </svg>
                  Export as .pdf
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Editor layout ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Editor main ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Editor canvas */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '48px 80px',
            background: '#F7F6F3',
            position: 'relative',
          }}>
            {/* AI suggestion card (floating, left of page) */}
            <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '-200px',
                top: '80px',
                width: '182px',
                background: '#FFFFFF',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '14px',
                padding: '12px 14px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}>
                <div style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#8B6914',
                  marginBottom: '6px',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  AI Suggestion
                </div>
                <p style={{
                  fontSize: '11.5px',
                  color: '#3A3A38',
                  lineHeight: 1.4,
                  marginBottom: '10px',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Consider adding a Force Majeure clause to protect against unforeseen events.
                </p>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button style={{
                    background: '#0F0F0E',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Accept
                  </button>
                  <button style={{
                    background: 'none',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: '#6B6B68',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Editor page */}
              <div style={{
                background: '#FFFFFF',
                padding: '72px 80px',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                minHeight: '900px',
              }}>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => handleContentChange((e.target as HTMLDivElement).innerHTML)}
                  dangerouslySetInnerHTML={{ __html: content || SAMPLE_CONTENT }}
                  style={{
                    fontFamily: "'Newsreader', serif",
                    fontSize: '14px',
                    lineHeight: 1.9,
                    color: '#3A3A38',
                    outline: 'none',
                    minHeight: '700px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right AI Panel ── */}
        <div style={{
          width: showPanel ? '340px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          background: '#FFFFFF',
          borderLeft: showPanel ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Panel topbar */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F0F0E', flex: 1, whiteSpace: 'nowrap' }}>
              AI Panel
            </span>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9A9A96',
                borderRadius: '6px',
                transition: TR,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* Citations section */}
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#9A9A96',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Citations
              <span style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.07)', display: 'block' }} />
            </div>

            {[
              { title: 'Smith v. Jones, 2019', court: '9th Cir.', quote: '"…the obligation of good faith extends to all contractual dealings…"' },
              { title: 'Baker Corp. v. Reed, 2021', court: 'S.D.N.Y.', quote: '"…force majeure clauses must be construed narrowly…"' },
            ].map((c, i) => (
              <div key={i} style={{
                background: '#F7F6F3',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '8px',
                border: '1px solid rgba(0,0,0,0.07)',
              }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F0F0E', marginBottom: '2px' }}>{c.title}</div>
                <div style={{ fontSize: '11px', color: '#6B6B68', marginBottom: '8px' }}>{c.court}</div>
                <div style={{
                  fontSize: '11.5px',
                  color: '#3A3A38',
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                  borderLeft: '2px solid #C9A84C',
                  paddingLeft: '8px',
                  marginBottom: '8px',
                }}>
                  {c.quote}
                </div>
                <button style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#1A4FBF',
                  background: '#EEF3FF',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Insert
                </button>
              </div>
            ))}

            {/* Clause Alternatives section */}
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#9A9A96',
              margin: '16px 0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Clause Alternatives
              <span style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.07)', display: 'block' }} />
            </div>

            {[
              'Either Party may terminate this Agreement upon thirty (30) days written notice to the other Party.',
              'This Agreement shall automatically renew for successive one-year terms unless terminated by either Party with sixty (60) days prior written notice.',
            ].map((clause, i) => (
              <div key={i} style={{
                background: '#F7F6F3',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '8px',
                border: '1px solid rgba(0,0,0,0.07)',
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#3A3A38',
                  lineHeight: 1.5,
                  marginBottom: '8px',
                  fontFamily: "'Newsreader', serif",
                }}>
                  {clause}
                </p>
                <button style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#1A7A4A',
                  background: '#E8F5EE',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Use this
                </button>
              </div>
            ))}
          </div>

          {/* Panel chat input */}
          <div style={{
            borderTop: '1px solid rgba(0,0,0,0.07)',
            padding: '12px',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              background: '#F7F6F3',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: '10px',
              padding: '8px 36px 8px 12px',
              position: 'relative',
            }}>
              <textarea
                placeholder="Ask AI anything…"
                rows={1}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: '12.5px',
                  fontFamily: "'DM Sans', sans-serif",
                  color: '#0F0F0E',
                  resize: 'none',
                  minHeight: '20px',
                  maxHeight: '80px',
                }}
              />
              <button style={{
                position: 'absolute',
                right: '8px',
                bottom: '8px',
                width: '30px',
                height: '30px',
                background: '#0F0F0E',
                border: 'none',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: TR,
              }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8">
                  <path d="M2 14l12-6L2 2v5l8 1-8 1v5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
