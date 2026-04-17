'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OnboardingStep2() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: '52px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '10px' }}>
        <div style={{ width: '28px', height: '28px', background: '#C9A84C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '14px' }}>L</div>
        <span style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: '#1D1D1F' }}>LegalMind</span>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)', width: '100%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ height: '3px', background: '#EFEDE8' }}>
            <div style={{ height: '3px', background: '#1D1D1F', width: '100%', transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ padding: '40px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9A96', marginBottom: '10px' }}>Step 2 of 2</p>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '34px', fontWeight: 600, letterSpacing: '-0.8px', color: '#1D1D1F', marginBottom: '8px', lineHeight: 1.15 }}>
              Ask your first question.
            </h1>
            <p style={{ fontSize: '14px', color: '#6B6B68', lineHeight: 1.5, marginBottom: '28px' }}>
              Your document is ready. Try asking something about it — the AI will cite exact page and line references.
            </p>

            {/* Simulated chat */}
            <div style={{ background: '#F7F6F3', borderRadius: '14px', padding: '16px', marginBottom: '20px', minHeight: '160px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>AI</div>
                <div style={{ background: '#fff', borderRadius: '4px 14px 14px 14px', padding: '11px 14px', fontSize: '13.5px', lineHeight: 1.6, color: '#1D1D1F', maxWidth: '85%' }}>
                  I&apos;ve loaded your document. Ask me anything — I&apos;ll cite exact page and line references for every answer.
                </div>
              </div>
              {sent && (
                <>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F5EDD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#8B6914', flexShrink: 0 }}>You</div>
                    <div style={{ background: '#1D1D1F', borderRadius: '14px 4px 14px 14px', padding: '11px 14px', fontSize: '13.5px', lineHeight: 1.6, color: '#fff', maxWidth: '85%' }}>{message}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>AI</div>
                    <div style={{ background: '#fff', borderRadius: '4px 14px 14px 14px', padding: '11px 14px', fontSize: '13.5px', lineHeight: 1.6, color: '#1D1D1F', maxWidth: '85%' }}>
                      I found relevant information in your document. <span style={{ background: '#F5EDD8', color: '#8B6914', fontSize: '11.5px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px', marginLeft: '4px' }}>Page 3, §2.1</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Input */}
            {!sent && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', background: '#F7F6F3', border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '10px 12px', marginBottom: '20px' }}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. What are the key obligations in this contract?"
                  rows={2}
                  style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '13.5px', fontFamily: 'Manrope, sans-serif', color: '#1D1D1F', resize: 'none' }}
                />
                <button
                  onClick={() => { if (message.trim()) setSent(true) }}
                  style={{ width: '32px', height: '32px', background: '#1D1D1F', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" width="14" height="14"><path d="M2 8h12M8 2l6 6-6 6"/></svg>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ width: '100%', height: '48px', background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', cursor: 'pointer' }}
              >
                Go to Dashboard →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
