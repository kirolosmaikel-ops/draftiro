'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [tab, setTab] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } })
    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Check your email for the magic link!' })
    setLoading(false)
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage({ type: 'error', text: error.message })
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left panel - dark */}
      <div style={{ width: '420px', background: '#141412', display: 'flex', flexDirection: 'column', padding: '48px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'auto' }}>
          <div style={{ width: '32px', height: '32px', background: '#C9A84C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '16px' }}>L</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>LegalMind</span>
        </div>
        <div style={{ marginBottom: 'auto' }}>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '42px', fontWeight: 400, color: '#fff', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '16px', fontStyle: 'italic' }}>
            The smartest workspace for the solo attorney.
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Upload case files. Chat with documents. Draft in minutes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[['40%', 'Less research time'], ['38', 'States covered'], ['SOC2', 'Type II']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: '24px', fontWeight: 700, color: '#fff' }}>{num}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - light */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', padding: '48px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '30px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.5px', marginBottom: '8px' }}>
            Welcome back.
          </h2>
          <p style={{ fontSize: '14px', color: '#6B6B68', marginBottom: '32px' }}>Sign in to your workspace.</p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: '28px' }}>
            {(['magic', 'password'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 500, color: tab === t ? '#1D1D1F' : '#9A9A96', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#1D1D1F' : 'transparent'}`, cursor: 'pointer', marginBottom: '-1px', fontFamily: 'Manrope, sans-serif', transition: 'all 0.18s ease' }}>
                {t === 'magic' ? 'Magic Link' : 'Password'}
              </button>
            ))}
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: message.type === 'success' ? '#E8F5EE' : '#FFE8E6', color: message.type === 'success' ? '#1A7A4A' : '#A0281A', fontSize: '13.5px' }}>
              {message.text}
            </div>
          )}

          {tab === 'magic' ? (
            <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@firm.com" style={{ width: '100%', height: '44px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '0 14px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', color: '#1D1D1F', background: '#fff', outline: 'none', transition: 'border-color 0.18s ease' }} />
              </div>
              <button type="submit" disabled={loading} style={{ height: '48px', background: '#d44439', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.18s ease' }}>
                {loading ? 'Sending…' : 'Send Magic Link →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@firm.com" style={{ width: '100%', height: '44px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '0 14px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', color: '#1D1D1F', background: '#fff', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', height: '44px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '0 14px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', color: '#1D1D1F', background: '#fff', outline: 'none' }} />
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <Link href="/forgot-password" style={{ fontSize: '12px', color: '#1A4FBF', textDecoration: 'none' }}>Forgot password?</Link>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ height: '48px', background: '#d44439', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          )}

          <p style={{ marginTop: '28px', textAlign: 'center', fontSize: '13.5px', color: '#9A9A96' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#1D1D1F', fontWeight: 600, textDecoration: 'none' }}>Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
