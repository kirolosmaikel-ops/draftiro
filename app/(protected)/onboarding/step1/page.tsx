'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

// ── Transition ─────────────────────────────────────────────────────────────

const TR = '0.18s cubic-bezier(0.4,0,0.2,1)'

// ── Component ──────────────────────────────────────────────────────────────

export default function OnboardingStep1() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dropzoneHovered, setDropzoneHovered] = useState(false)
  const [primaryHovered, setPrimaryHovered] = useState(false)
  const [skipHovered, setSkipHovered] = useState(false)
  const [hoveredChip, setHoveredChip] = useState<string | null>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  async function handleUpload() {
    if (!file) {
      router.push('/dashboard')
      return
    }
    setUploading(true)
    let docId: string | null = null
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: form })
      if (res.ok) {
        const j = await res.json() as { id?: string }
        docId = j.id ?? null
      }
    } catch {
      // continue even on error
    }
    setUploading(false)
    // Land on chat preselected to the doc the user just uploaded — they can ask
    // a question immediately. If no doc id came back, just go to dashboard.
    router.push(docId ? `/chat?doc=${docId}` : '/dashboard')
  }

  const SAMPLE_FILES = ['📋 Sample NDA.pdf', '⚖️ Sample Deposition.pdf', '🏛️ Sample Motion.pdf']

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F6F3',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* ── Header ── */}
      <header style={{
        height: '52px',
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '10px',
        flexShrink: 0,
      }}>
        {/* Logomark */}
        <div style={{
          width: '24px',
          height: '24px',
          background: '#C9A84C',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Newsreader', serif",
          fontWeight: 700,
          color: '#FFFFFF',
          fontSize: '12px',
          flexShrink: 0,
        }}>
          L
        </div>
        <span style={{
          fontFamily: "'Newsreader', serif",
          fontSize: '16px',
          fontWeight: 700,
          color: '#0F0F0E',
          letterSpacing: '-0.3px',
        }}>
          Draftiro
        </span>
      </header>

      {/* ── Main ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid rgba(0,0,0,0.07)',
          width: '100%',
          maxWidth: '560px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        }}>

          {/* Progress bar */}
          <div style={{ height: '3px', background: '#EFEDE8' }}>
            <div style={{ height: '3px', background: '#0F0F0E', width: '50%', transition: 'width 0.4s ease' }} />
          </div>

          {/* Card body */}
          <div style={{ padding: '40px' }}>

            {/* Step label */}
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#9A9A96',
              marginBottom: '10px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Step 1 of 2
            </p>

            {/* Heading */}
            <h1 style={{
              fontFamily: "'Newsreader', serif",
              fontSize: '34px',
              fontWeight: 600,
              letterSpacing: '-0.8px',
              color: '#0F0F0E',
              marginBottom: '8px',
              lineHeight: 1.15,
            }}>
              Add your first case file.
            </h1>

            {/* Sub-text */}
            <p style={{
              fontSize: '14px',
              color: '#6B6B68',
              lineHeight: 1.5,
              marginBottom: '28px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Draftiro reads your documents and becomes your personal legal research assistant.
            </p>

            {/* Dropzone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onMouseEnter={() => setDropzoneHovered(true)}
              onMouseLeave={() => setDropzoneHovered(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1.5px dashed ${dragging ? '#6B6B68' : dropzoneHovered ? '#6B6B68' : '#C8C8C4'}`,
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging || dropzoneHovered ? '#FFFFFF' : '#F7F6F3',
                transition: TR,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Icon */}
              <div style={{ fontSize: '36px', marginBottom: '10px', lineHeight: 1 }}>📄</div>

              {/* Text */}
              <div style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#3A3A38',
                marginBottom: '4px',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {file ? file.name : 'Click or drag your file here'}
              </div>

              <div style={{
                fontSize: '12px',
                color: '#9A9A96',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                PDF, DOCX, TXT — up to 500MB
              </div>
            </div>

            {/* Sample chips */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              marginTop: '20px',
            }}>
              {SAMPLE_FILES.map(chip => (
                <button
                  key={chip}
                  onMouseEnter={() => setHoveredChip(chip)}
                  onMouseLeave={() => setHoveredChip(null)}
                  onClick={() => {
                    // Simulate selecting a sample file
                    const mockFile = new File([''], chip, { type: 'application/pdf' })
                    setFile(mockFile)
                  }}
                  style={{
                    padding: '6px 14px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '99px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#3A3A38',
                    background: hoveredChip === chip ? '#F7F6F3' : '#FFFFFF',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: TR,
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div style={{
              marginTop: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              {/* Primary button */}
              <button
                onClick={handleUpload}
                disabled={uploading}
                onMouseEnter={() => setPrimaryHovered(true)}
                onMouseLeave={() => setPrimaryHovered(false)}
                style={{
                  width: '100%',
                  height: '48px',
                  background: primaryHovered && !uploading ? '#3A3A38' : '#0F0F0E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.7 : 1,
                  transition: TR,
                }}
              >
                {uploading ? 'Uploading…' : 'Upload & Continue →'}
              </button>

              {/* Skip link */}
              <button
                onClick={() => router.push('/dashboard')}
                onMouseEnter={() => setSkipHovered(true)}
                onMouseLeave={() => setSkipHovered(false)}
                style={{
                  fontSize: '13px',
                  color: skipHovered ? '#0F0F0E' : '#9A9A96',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: TR,
                }}
              >
                I&apos;ll do this later
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
