'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [firmName, setFirmName] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? '')
      if (user) {
        const { data: userRow } = await supabase
          .from('users').select('firm_id').eq('id', user.id).single()
        if (userRow?.firm_id) {
          const { data: firm } = await supabase
            .from('firms').select('name').eq('id', userRow.firm_id).single()
          setFirmName(firm?.name ?? '')
        }
      }
    })()
  }, [])

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '40px 36px 120px',
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: '680px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8B6914',
          marginBottom: '8px',
        }}>
          Account
        </div>
        <h1 style={{
          fontFamily: 'Newsreader, serif',
          fontSize: '28px',
          fontWeight: 600,
          letterSpacing: '-0.5px',
          color: '#0F0F0E',
          margin: '0 0 32px',
        }}>
          Settings
        </h1>

        {/* Profile card */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: '16px',
          padding: '24px 26px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F0F0E', marginBottom: '14px' }}>
            Profile
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', fontSize: '13.5px' }}>
            <div style={{ color: '#9A9A96' }}>Email</div>
            <div style={{ color: '#0F0F0E' }}>{email || '—'}</div>
            <div style={{ color: '#9A9A96' }}>Firm</div>
            <div style={{ color: '#0F0F0E' }}>{firmName || '—'}</div>
          </div>
          <div style={{ marginTop: '18px', fontSize: '12.5px', color: '#9A9A96', lineHeight: 1.6 }}>
            Profile editing (display name, password, notification preferences) is coming soon.
            Need to change your email today? Email <a href="mailto:support@draftiro.com" style={{ color: '#1A4FBF' }}>support@draftiro.com</a>.
          </div>
        </div>

        {/* Quick links */}
        <div style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <Link href="/billing" style={linkStyle}>Billing &amp; subscription →</Link>
          <Link href="/privacy" style={linkStyle}>Privacy policy →</Link>
          <Link href="/terms" style={linkStyle}>Terms of service →</Link>
          <Link href="/cancellation" style={linkStyle}>Cancellation policy →</Link>
        </div>
      </div>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  padding: '10px 4px',
  fontSize: '13.5px',
  color: '#0F0F0E',
  textDecoration: 'none',
  borderBottom: '1px solid rgba(0,0,0,0.05)',
}
