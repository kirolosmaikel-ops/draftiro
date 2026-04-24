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
  const [error, setError] = useState(urlError ? decodeURIComponent(urlError) : '')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError))
  }, [urlError])

  const supabase = createClient()

  // ── Password sign-in ─────────────────────────────────────────────────────
  const handleSignIn = async () => {
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      console.log('[login] handleSignIn for:', email)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('[login] signInWithPassword error:', error.message)
        setError(error.message)
        setLoading(false)
        return
      }
      if (data.session) {
        console.log('[login] session ok, calling setup-profile…')
        await fetch('/api/auth/setup-profile', { method: 'POST' })
        console.log('[login] redirecting to /dashboard')
        window.location.href = '/dashboard'
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      console.error('[login] unexpected error:', msg)
      setError(msg)
      setLoading(false)
    }
  }

  // ── Password sign-up ──────────────────────────────────────────────────────
  const handleSignUp = async () => {
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/auth/callback' },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      if (data.session) {
        await fetch('/api/auth/setup-profile', { method: 'POST' })
        window.location.href = '/dashboard'
      } else {
        setSuccessMsg('Account created! Check your email to confirm, then sign in.')
        setLoading(false)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg)
      setLoading(false)
    }
  }

  // ── Magic link ────────────────────────────────────────────────────────────
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccessMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccessMsg('Magic link sent! Check your inbox (and spam folder).')
    }
    setLoading(false)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    border: '1.5px solid rgba(0,0,0,0.08)',
    borderRadius: '14px',
    padding: '0 16px',
    fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif',
    color: '#0F0F0E',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#6B6B68',
    marginBottom: '7px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  }
  const primaryBtnStyle: React.CSSProperties = {
    width: '100%',
    height: '50px',
    background: loading ? '#3A3A38' : '#0F0F0E',
    color: '#fff',
    border: 'none',
    borderRadius: '99px',
    fontSize: '15px',
    fontWeight: 700,
    fontFamily: 'DM Sans, sans-serif',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.18s ease, transform 0.12s ease',
    transform: loading ? 'none' : undefined,
  }

  const passwordSection = (
    <>
      <div>
        <label htmlFor="email" style={labelStyle}>Email Address</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@firm.com"
          style={inputStyle}
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          minLength={6}
          style={inputStyle}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
        {mode === 'signup' && (
          <p style={{ fontSize: '11.5px', color: '#9A9A96', marginTop: '5px', fontFamily: 'DM Sans, sans-serif' }}>
            Minimum 6 characters
          </p>
        )}
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Left panel ── */}
      <div style={{
        width: '420px',
        background: '#141412',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'auto' }}>
          <div style={{
            width: '32px', height: '32px', background: '#C9A84C', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '16px',
          }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
            Draftiro
          </span>
        </div>

        <div style={{ marginBottom: 'auto' }}>
          <h1 style={{
            fontFamily: 'Newsreader, serif', fontSize: '42px', fontWeight: 400,
            color: '#fff', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '16px', fontStyle: 'italic',
          }}>
            The smartest workspace for the solo attorney.
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
            Upload case files. Chat with documents. Draft briefs in minutes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap' }}>
          {[['40%', 'Less research time'], ['38', 'States covered'], ['SOC2', 'Type II']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700, color: '#fff' }}>{num}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F6F3',
        padding: '48px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Env warning */}
          {!supabaseConfigured && (
            <div style={{
              padding: '14px 16px', background: '#FFF3CD', border: '1px solid #FBBF24',
              borderRadius: '14px', marginBottom: '24px', fontSize: '13px', color: '#92400E', lineHeight: 1.6,
            }}>
              <strong>⚠ Supabase not configured.</strong> Add{' '}
              <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: '4px' }}>NEXT_PUBLIC_SUPABASE_URL</code>
              {' '}and{' '}
              <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: '4px' }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              {' '}in Vercel → Environment Variables.
            </div>
          )}

          <h2 style={{
            fontFamily: 'Newsreader, serif', fontSize: '32px', fontWeight: 600,
            color: '#0F0F0E', letterSpacing: '-0.5px', marginBottom: '6px',
          }}>
            {mode === 'signup' ? 'Create your account.' : 'Welcome back.'}
          </h2>
          <p style={{ fontSize: '14px', color: '#6B6B68', marginBottom: '28px', lineHeight: 1.5 }}>
            {mode === 'signup'
              ? 'Free 14-day trial. No credit card required.'
              : 'Sign in to your Draftiro workspace.'}
          </p>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: '12px',
            padding: '3px',
            marginBottom: '24px',
            gap: '2px',
          }}>
            {(['magic', 'password'] as Tab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(''); setSuccessMsg('') }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: tab === t ? '#0F0F0E' : '#9A9A96',
                  background: tab === t ? '#fff' : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.15s ease',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t === 'magic' ? '✉ Magic Link' : '🔑 Password'}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: '12px', marginBottom: '16px',
              fontSize: '13.5px', lineHeight: 1.5,
              background: '#FFE8E6', color: '#A0281A', border: '1px solid #FFBDBA',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Success banner */}
          {successMsg && (
            <div style={{
              padding: '12px 16px', borderRadius: '12px', marginBottom: '16px',
              fontSize: '13.5px', lineHeight: 1.5,
              background: '#E8F5EE', color: '#1A7A4A', border: '1px solid #B8E6C8',
            }}>
              ✓ {successMsg}
            </div>
          )}

          {/* ── Magic Link tab ── */}
          {tab === 'magic' && (
            <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="magic-email" style={labelStyle}>Email Address</label>
                <input
                  id="magic-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@firm.com"
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
              <button type="submit" disabled={loading} style={primaryBtnStyle}>
                {loading ? <><LoadingSpinner /> Sending…</> : 'Send Magic Link →'}
              </button>
              <p style={{ fontSize: '12px', color: '#9A9A96', textAlign: 'center', lineHeight: 1.5 }}>
                We&apos;ll email a one-click sign-in link. No password needed.
              </p>
            </form>
          )}

          {/* ── Password tab — Sign In ── */}
          {tab === 'password' && mode === 'signin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {passwordSection}
              <button
                type="button"
                disabled={loading}
                onClick={handleSignIn}
                style={primaryBtnStyle}
              >
                {loading ? <><LoadingSpinner /> Signing in…</> : 'Sign In →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#9A9A96' }}>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); setSuccessMsg('') }}
                  style={{
                    color: '#0F0F0E', fontWeight: 700, background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '13.5px', fontFamily: 'DM Sans, sans-serif', padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Start free trial
                </button>
              </p>
            </div>
          )}

          {/* ── Password tab — Sign Up ── */}
          {tab === 'password' && mode === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {passwordSection}
              <button
                type="button"
                disabled={loading}
                onClick={handleSignUp}
                style={{
                  ...primaryBtnStyle,
                  background: loading ? '#3A3A38' : '#C9A84C',
                  color: '#0F0F0E',
                }}
              >
                {loading ? <><LoadingSpinner color="#0F0F0E" /> Creating account…</> : 'Start Free Trial →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '13.5px', color: '#9A9A96' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); setSuccessMsg('') }}
                  style={{
                    color: '#0F0F0E', fontWeight: 700, background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '13.5px', fontFamily: 'DM Sans, sans-serif', padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* Help link */}
          <div style={{
            marginTop: '28px',
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '14px',
          }}>
            <p style={{ fontSize: '12.5px', color: '#6B6B68', lineHeight: 1.6, marginBottom: '4px' }}>
              <strong style={{ color: '#3A3A38' }}>Can&apos;t log in?</strong> Create a confirmed account instantly:
            </p>
            <Link
              href="/setup"
              style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A4FBF', textDecoration: 'none' }}
            >
              Go to /setup →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}

function LoadingSpinner({ color = '#fff' }: { color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px',
      height: '14px',
      border: `2px solid ${color === '#fff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)'}`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.65s linear infinite',
      flexShrink: 0,
    }} />
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
