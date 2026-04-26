'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * /setup — First-time account setup page (publicly accessible)
 *
 * Creates a Supabase user with email_confirm=true via the admin API,
 * bypassing the email confirmation requirement. Use this to get your
 * first account working without needing to configure SMTP.
 *
 * After creating your account here, sign in at /login with password tab.
 */
export default function SetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/auth/admin-create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        setResult({ type: 'error', text: json.error ?? 'Unknown error' })
      } else {
        setResult({
          type: 'success',
          text: `Account ${json.action === 'updated' ? 'updated' : 'created'} for ${json.email}. You can now sign in with your password.`,
        })
        setDone(true)
      }
    } catch (err) {
      setResult({ type: 'error', text: `Network error: ${err}` })
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '44px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px',
    padding: '0 14px', fontSize: '14px', fontFamily: 'inherit', color: '#1D1D1F',
    background: '#fff', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', background: '#C9A84C', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '16px' }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 700, color: '#0F0F0E', letterSpacing: '-0.3px' }}>Draftiro</span>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '8px' }}>
              First-Time Setup
            </div>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '24px', fontWeight: 600, color: '#0F0F0E', letterSpacing: '-0.4px', marginBottom: '8px' }}>
              Create your account
            </h1>
            <p style={{ fontSize: '13.5px', color: '#6B6B68', lineHeight: 1.6 }}>
              This creates a confirmed account so you can sign in immediately — no email confirmation needed.
            </p>
          </div>

          {result && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px', lineHeight: 1.5,
              background: result.type === 'success' ? '#E8F5EE' : '#FFE8E6',
              color: result.type === 'success' ? '#1A7A4A' : '#A0281A',
              border: `1px solid ${result.type === 'success' ? '#B8E6C8' : '#FFBDBA'}`,
            }}>
              {result.type === 'error' ? '⚠ ' : '✓ '}{result.text}
            </div>
          )}

          {done ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/login" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '48px', background: '#0F0F0E', color: '#fff', borderRadius: '10px',
                fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', textDecoration: 'none',
              }}>
                Go to Sign In →
              </Link>
              <p style={{ fontSize: '12px', color: '#9A9A96', textAlign: 'center' }}>
                Use the <strong>Password</strong> tab and enter the email and password you just set.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@firm.com" style={inputStyle} autoComplete="email" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B6B68', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} style={inputStyle} autoComplete="new-password" />
                <p style={{ fontSize: '11.5px', color: '#9A9A96', marginTop: '5px' }}>Minimum 6 characters</p>
              </div>
              <button type="submit" disabled={loading} style={{ height: '48px', background: '#0F0F0E', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        {/* Diagnostic info */}
        <div style={{ marginTop: '20px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8B6914', marginBottom: '10px' }}>Why this page exists</div>
          <p style={{ fontSize: '12.5px', color: '#6B6B68', lineHeight: 1.65 }}>
            Supabase requires email confirmation by default. This page uses the service role key to create a confirmed user, bypassing the confirmation step. Once you&apos;re set up, use <Link href="/login" style={{ color: '#1A4FBF' }}>/login</Link> to sign in.
          </p>
          <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#6B6B68', lineHeight: 1.65 }}>
            To permanently disable email confirmation in Supabase:<br />
            Authentication → Settings → <strong>uncheck &quot;Enable email confirmations&quot;</strong>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#9A9A96' }}>
          <Link href="/" style={{ color: '#9A9A96', textDecoration: 'none' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
