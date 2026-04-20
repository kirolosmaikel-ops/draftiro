'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Suspense } from 'react'

type Tab = 'magic' | 'password'
type Mode = 'signin' | 'signup'

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [tab, setTab] = useState<Tab>('magic')
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    urlError ? { type: 'error', text: decodeURIComponent(urlError) } : null
  )

  // Re-surface URL error when it changes (e.g. after a server-side redirect)
  useEffect(() => {
    if (urlError) setMessage({ type: 'error', text: decodeURIComponent(urlError) })
  }, [urlError])

  const supabase = createClient()

  // ── Magic link (client-side — just sends email, no session to set) ──────
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      console.error('[login] magic link error:', error)
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Magic link sent! Check your inbox (and spam folder).' })
    }
    setLoading(false)
  }

  // ── Sign up (client-side — admin create confirmed user via /setup is preferred) ──
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setMessage(null)
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) {
      console.error('[login] sign up error:', error)
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
      return
    }
    if (data.session?.access_token) {
      try {
        await fetch('/api/auth/setup-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ access_token: data.session.access_token }),
        })
      } catch { /* non-fatal */ }
      window.location.href = '/dashboard'
    } else {
      setMessage({ type: 'success', text: 'Account created! Check your email to confirm it, then sign in. Or use /setup to create a confirmed account instantly.' })
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '44px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px',
    padding: '0 14px', fontSize: '14px', fontFamily: 'inherit', color: '#1D1D1F',
    background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s ease',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68',
    marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Left panel */}
      <div style={{ width: '420px', background: '#141412', display: 'flex', flexDirection: 'column', padding: '48px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'auto' }}>
          <div style={{ width: '32px', height: '32px', background: '#C9A84C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '16px' }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Draftiro</span>
        </div>
        <div style={{ marginBottom: 'auto' }}>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '42px', fontWeight: 400, color: '#fff', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '16px', fontStyle: 'italic' }}>
            The smartest workspace for the solo attorney.
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Upload case files. Chat with documents. Draft in minutes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {[['40%', 'Less research time'], ['38', 'States covered'], ['SOC2', 'Type II']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: '24px', fontWeight: 700, color: '#fff' }}>{num}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', padding: '48px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Env var warning */}
          {!supabaseConfigured && (
            <div style={{ padding: '14px 16px', background: '#FFF3CD', border: '1px solid #FBBF24', borderRadius: '10px', marginBottom: '24px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
              <strong>⚠ Supabase not configured.</strong> Add{' '}
              <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.08)', padding: '1px 4px', borderRadius: '3px' }}>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.08)', padding: '1px 4px', borderRadius: '3px' }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
              in Vercel → Environment Variables.
            </div>
          )}

          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '30px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            {mode === 'signup' ? 'Create your account.' : 'Welcome back.'}
          </h2>
          <p style={{ fontSize: '14px', color: '#6B6B68', marginBottom: '28px' }}>
            {mode === 'signup' ? 'Free 14-day trial. No credit card required.' : 'Sign in to your Draftiro workspace.'}
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: '24px' }}>
            {(['magic', 'password'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setMessage(null) }} style={{
                padding: '10px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 500,
                color: tab === t ? '#1D1D1F' : '#9A9A96', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t ? '#1D1D1F' : 'transparent'}`,
                cursor: 'pointer', marginBottom: '-1px', fontFamily: 'inherit', transition: 'all 0.18s ease',
              }}>
                {t === 'magic' ? 'Magic Link' : 'Password'}
              </button>
            ))}
          </div>

          {/* Error / success banner */}
          {message && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px', lineHeight: 1.5,
              background: message.type === 'success' ? '#E8F5EE' : '#FFE8E6',
              color: message.type === 'success' ? '#1A7A4A' : '#A0281A',
              border: `1px solid ${message.type === 'success' ? '#B8E6C8' : '#FFBDBA'}`,
            }}>
              {message.type === 'error' ? '⚠ ' : '✓ '}{message.text}
            </div>
          )}

          {/* ── Magic link tab ── */}
          {tab === 'magic' && (
            <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@firm.com" style={inputStyle} autoComplete="email" />
              </div>
              <button type="submit" disabled={loading} style={{ height: '48px', background: '#0F0F0E', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.18s ease' }}>
                {loading ? 'Sending…' : 'Send Magic Link →'}
              </button>
              <p style={{ fontSize: '12px', color: '#9A9A96', textAlign: 'center', lineHeight: 1.5 }}>
                We&apos;ll email a one-click sign-in link. No password needed.
              </p>
            </form>
          )}

          {/* ── Password tab — Sign In (native form POST → server route) ── */}
          {tab === 'password' && mode === 'signin' && (
            <form action="/api/auth/signin" method="post" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" name="email" required placeholder="you@firm.com" style={inputStyle} autoComplete="email" />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" name="password" required placeholder="••••••••" minLength={6} style={inputStyle} autoComplete="current-password" />
              </div>
              <button type="submit" style={{ height: '48px', background: '#0F0F0E', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.18s ease' }}>
                Sign In →
              </button>
              <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#9A9A96', marginTop: '4px' }}>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => { setMode('signup'); setMessage(null) }} style={{ color: '#1D1D1F', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13.5px', fontFamily: 'inherit', padding: 0 }}>
                  Create account free
                </button>
              </p>
            </form>
          )}

          {/* ── Password tab — Sign Up (client-side, needs session handling) ── */}
          {tab === 'password' && mode === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@firm.com" style={inputStyle} autoComplete="email" />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} style={inputStyle} autoComplete="new-password" />
                <p style={{ fontSize: '11.5px', color: '#9A9A96', marginTop: '5px' }}>Minimum 6 characters</p>
              </div>
              <button type="submit" disabled={loading} style={{ height: '48px', background: '#0F0F0E', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating account…' : 'Create Account →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#9A9A96', marginTop: '4px' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('signin'); setMessage(null) }} style={{ color: '#1D1D1F', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13.5px', fontFamily: 'inherit', padding: 0 }}>
                  Sign in instead
                </button>
              </p>
            </form>
          )}

          {/* Setup link */}
          <div style={{ marginTop: '28px', padding: '14px 16px', background: '#F0EDE8', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '10px' }}>
            <p style={{ fontSize: '12.5px', color: '#6B6B68', lineHeight: 1.6, marginBottom: '6px' }}>
              <strong style={{ color: '#3A3A38' }}>Can&apos;t log in?</strong> If Supabase email confirmation is blocking you:
            </p>
            <Link href="/setup" style={{ fontSize: '12.5px', fontWeight: 600, color: '#1A4FBF', textDecoration: 'none' }}>
              Create a confirmed account at /setup →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
