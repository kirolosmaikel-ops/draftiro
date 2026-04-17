'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OnboardingStep1() {
  const router = useRouter()
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <header style={{ height: '52px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '10px' }}>
        <div style={{ width: '28px', height: '28px', background: '#C9A84C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '14px' }}>L</div>
        <span style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.3px' }}>LegalMind</span>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)', width: '100%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          {/* Progress */}
          <div style={{ height: '3px', background: '#EFEDE8' }}>
            <div style={{ height: '3px', background: '#1D1D1F', width: '50%', transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ padding: '40px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9A96', marginBottom: '10px' }}>Step 1 of 2</p>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '34px', fontWeight: 600, letterSpacing: '-0.8px', color: '#1D1D1F', marginBottom: '8px', lineHeight: 1.15 }}>
              Add your first case file.
            </h1>
            <p style={{ fontSize: '14px', color: '#6B6B68', lineHeight: 1.5, marginBottom: '28px' }}>
              LegalMind reads your documents and becomes your personal legal research assistant.
            </p>

            {/* Dropzone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
              onClick={() => document.getElementById('file-input')?.click()}
              style={{ border: `1.5px dashed ${dragging ? '#9A9A96' : '#C8C8C4'}`, borderRadius: '14px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#F7F6F3' : '#F7F6F3', transition: 'all 0.18s ease' }}
            >
              <input id="file-input" type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📄</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#3A3A38', marginBottom: '4px' }}>
                {file ? file.name : 'Click or drag your file here'}
              </div>
              <div style={{ fontSize: '12px', color: '#9A9A96' }}>PDF, DOCX, TXT — up to 500MB</div>
            </div>

            {/* Sample chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
              {['📋 Sample NDA.pdf', '⚖️ Sample Deposition.pdf', '🏛️ Sample Motion.pdf'].map(chip => (
                <button key={chip} style={{ padding: '6px 14px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '99px', fontSize: '12px', fontWeight: 500, color: '#3A3A38', background: '#fff', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                  {chip}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => router.push('/onboarding/step2')}
                style={{ width: '100%', height: '48px', background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', cursor: 'pointer' }}
              >
                Upload &amp; Continue →
              </button>
              <button onClick={() => router.push('/dashboard')} style={{ fontSize: '13px', color: '#9A9A96', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                I&apos;ll do this later
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
