'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRACTICE_AREAS = [
  'General Practice',
  'Family Law',
  'Criminal Defense',
  'Personal Injury',
  'Estate Planning',
  'Real Estate',
  'Corporate / Business',
  'Immigration',
  'Employment',
  'Bankruptcy',
  'Tax',
  'Intellectual Property',
  'Other',
]

/**
 * One-time onboarding modal. Asks for the user's name, firm name, and primary
 * practice area. Shown the first time a user lands inside the app after signup
 * (when `users.onboarded_at` is null).
 *
 * On submit:
 *   - users.full_name = displayName, onboarded_at = now()
 *   - firms.name      = firmName (if not blank)
 */
export function OnboardingModal() {
  const supabase = createClient()
  const [needs, setNeeds] = useState<null | boolean>(null)
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [firmName, setFirmName] = useState('')
  const [practiceArea, setPracticeArea] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setNeeds(false); return }
      const { data: row } = await supabase
        .from('users')
        .select('full_name, onboarded_at, firm_id')
        .eq('id', user.id)
        .single()
      if (!row) { setNeeds(false); return }
      setNeeds(!row.onboarded_at)
      // Prefill from email if it looks human; otherwise leave blank
      const local = (user.email ?? '').split('@')[0] ?? ''
      const looksHuman = /^[a-zA-Z][a-zA-Z'-]{1,30}$/.test(local)
      if (looksHuman) setDisplayName(local.charAt(0).toUpperCase() + local.slice(1))
      // Prefill firm
      if (row.firm_id) {
        const { data: firm } = await supabase
          .from('firms')
          .select('name')
          .eq('id', row.firm_id)
          .single()
        if (firm?.name && !/'s Firm$/.test(firm.name)) setFirmName(firm.name)
      }
    })()
  }, [])

  async function handleSubmit() {
    if (!displayName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    await supabase.from('users')
      .update({ full_name: displayName.trim(), onboarded_at: new Date().toISOString() })
      .eq('id', user.id)

    if (firmName.trim()) {
      const { data: row } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
      if (row?.firm_id) {
        await supabase.from('firms').update({ name: firmName.trim() }).eq('id', row.firm_id)
      }
    }

    setNeeds(false)
    setSaving(false)
  }

  if (!needs) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(15,15,14,0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: '460px',
        background: '#FFFFFF', borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.24)',
        padding: '36px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{
            width: '32px', height: '32px', background: '#C9A84C',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '15px',
          }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 600 }}>Welcome to Draftiro</span>
        </div>

        {step === 1 ? (
          <>
            <h1 style={{
              fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 600,
              letterSpacing: '-0.5px', margin: '0 0 6px',
            }}>
              What should we call you?
            </h1>
            <p style={{ fontSize: '13.5px', color: '#6B6B68', margin: '0 0 20px' }}>
              We use this to personalize your dashboard and any drafts you generate.
            </p>

            <Field label="Your name">
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Sarah Chen"
                style={inputStyle}
                autoFocus
              />
            </Field>

            <Field label="Firm name (optional)">
              <input
                value={firmName}
                onChange={e => setFirmName(e.target.value)}
                placeholder="e.g. Chen Law Group"
                style={inputStyle}
              />
            </Field>

            <button
              onClick={() => setStep(2)}
              disabled={!displayName.trim()}
              style={{
                ...primaryBtnStyle,
                opacity: displayName.trim() ? 1 : 0.5,
                cursor: displayName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Continue →
            </button>
          </>
        ) : (
          <>
            <h1 style={{
              fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 600,
              letterSpacing: '-0.5px', margin: '0 0 6px',
            }}>
              What's your practice area?
            </h1>
            <p style={{ fontSize: '13.5px', color: '#6B6B68', margin: '0 0 20px' }}>
              We&apos;ll tailor example prompts and templates to match. (You can change this later.)
            </p>

            <Field label="Primary practice area">
              <select
                value={practiceArea}
                onChange={e => setPracticeArea(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select an area…</option>
                {PRACTICE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, height: '44px', background: '#fff',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '10px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 500, color: '#3A3A38', fontFamily: 'inherit',
                }}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ ...primaryBtnStyle, flex: 2, marginTop: 0, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving…' : 'Get started →'}
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: '20px', fontSize: '11.5px', color: '#9A9A96', textAlign: 'center' }}>
          You can change these any time in <strong>Settings</strong>.
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{
        display: 'block', fontSize: '11px', fontWeight: 700,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        color: '#6B6B68', marginBottom: '6px',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: '44px',
  border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '12px',
  padding: '0 14px', fontSize: '14px', color: '#0F0F0E',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', height: '46px', marginTop: '8px',
  background: '#0F0F0E', color: '#fff', border: 'none',
  borderRadius: '12px',
  fontSize: '14px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
}
