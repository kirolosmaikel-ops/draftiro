'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Draft {
  id: string
  title: string
  content: string
  updated_at: string
}

export default function EditorPage() {
  const supabase = createClient()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null)
  const [title, setTitle] = useState('Untitled Draft')
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showExportDD, setShowExportDD] = useState(false)
  const [exporting, setExporting] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.from('drafts').select('id,title,content,updated_at').order('updated_at', { ascending: false })
      .then(({ data }) => {
        setDrafts(data ?? [])
        if (data?.length) {
          setActiveDraft(data[0])
          setTitle(data[0].title)
          setContent(data[0].content)
        }
      })
  }, [])

  function handleContentChange(val: string) {
    setContent(val)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveDraft(val, title), 2000)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveDraft(content, val), 2000)
  }

  async function saveDraft(body = content, t = title) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (activeDraft) {
      await fetch('/api/editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeDraft.id, title: t, content: body }),
      })
    } else {
      const res = await fetch('/api/editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, content: body }),
      })
      const json = await res.json()
      if (json.id) setActiveDraft({ id: json.id, title: t, content: body, updated_at: new Date().toISOString() })
    }
    setSaved(true)
    setSaving(false)
  }

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

  function newDraft() {
    setActiveDraft(null)
    setTitle('Untitled Draft')
    setContent('')
    setSaved(true)
  }

  const toolbarBtn = (label: string, command: string, value?: string) => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); document.execCommand(command, false, value) }}
      style={{
        width: '28px', height: '28px', border: 'none', background: 'none', borderRadius: '6px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color: '#6B6B68', fontFamily: 'Manrope, sans-serif',
      }}>
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Topbar / Toolbar */}
      <div style={{
        height: '46px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex',
        alignItems: 'center', padding: '0 20px', gap: '8px', flexShrink: 0, background: '#fff',
      }}>
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled Draft…"
          style={{ border: 'none', background: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: '#1D1D1F', fontFamily: 'Manrope, sans-serif', flex: 1, minWidth: 0 }}
        />
        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.07)', margin: '0 4px' }} />
        {toolbarBtn('B', 'bold')}
        {toolbarBtn('I', 'italic')}
        {toolbarBtn('U', 'underline')}
        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.07)', margin: '0 4px' }} />
        {toolbarBtn('H1', 'formatBlock', 'h1')}
        {toolbarBtn('H2', 'formatBlock', 'h2')}
        {toolbarBtn('¶', 'formatBlock', 'p')}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '11.5px', color: saved ? '#1A7A4A' : '#9A9A96' }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Unsaved'}
          </span>
          <button
            onClick={() => saveDraft()}
            style={{
              background: 'none', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px',
              padding: '0 12px', height: '30px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              color: '#3A3A38', fontFamily: 'Manrope, sans-serif',
            }}>
            Save
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportDD(p => !p)}
              disabled={exporting}
              style={{
                background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: '10px',
                padding: '0 16px', height: '32px', fontSize: '12.5px', fontWeight: 600,
                fontFamily: 'Manrope, sans-serif', cursor: 'pointer',
              }}>
              {exporting ? 'Exporting…' : 'Export ▾'}
            </button>
            {showExportDD && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: '180px',
                background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 100, overflow: 'hidden',
              }}>
                <div onClick={() => exportDoc('docx')} style={{ padding: '9px 14px', fontSize: '13px', color: '#1A4FBF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1" width="9" height="14" rx="1" /><path d="M11 4h3l-3 4h3" /></svg>
                  Export as .docx
                </div>
                <div onClick={() => exportDoc('pdf')} style={{ padding: '9px 14px', fontSize: '13px', color: '#A0281A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1" width="12" height="14" rx="1" /><path d="M5 6h6M5 9h6M5 12h4" /></svg>
                  Export as .pdf
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Drafts sidebar */}
        <div style={{ width: '220px', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', background: '#F7F6F3', flexShrink: 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9A96' }}>Drafts</span>
            <button onClick={newDraft} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B68', fontSize: '18px', lineHeight: 1 }}>+</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {drafts.length === 0 && (
              <div style={{ padding: '16px', fontSize: '12px', color: '#9A9A96' }}>No drafts yet.</div>
            )}
            {drafts.map(d => (
              <div key={d.id} onClick={() => { setActiveDraft(d); setTitle(d.title); setContent(d.content) }} style={{
                padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)',
                background: activeDraft?.id === d.id ? '#fff' : 'transparent',
                borderLeft: activeDraft?.id === d.id ? '2px solid #d44439' : '2px solid transparent',
              }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1D1D1F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                <div style={{ fontSize: '10.5px', color: '#9A9A96', marginTop: '2px' }}>{new Date(d.updated_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '48px 80px', background: '#F7F6F3', position: 'relative' }}>
          <div style={{
            background: '#fff', maxWidth: '680px', margin: '0 auto',
            padding: '72px 80px', borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)', minHeight: '900px',
          }}>
            <div
              contentEditable
              suppressContentEditableWarning
              onInput={e => handleContentChange((e.target as HTMLDivElement).innerHTML)}
              dangerouslySetInnerHTML={{ __html: content || '<p>Start writing your draft here…</p>' }}
              style={{
                fontFamily: 'Newsreader, serif', fontSize: '14px', lineHeight: 1.9,
                color: '#3A3A38', outline: 'none', minHeight: '700px',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
