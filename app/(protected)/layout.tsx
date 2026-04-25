'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const WORKSPACE_NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'Cases & Documents',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <path d="M2 2h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    href: '/cases',
    label: 'Cases',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <rect x="1" y="4" width="14" height="10" rx="1" />
        <path d="M5 4V3a2 2 0 014 0v1" />
      </svg>
    ),
  },
  {
    href: '/knowledge',
    label: 'Knowledge Base',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M5 5h6M5 8h6M5 11h4" />
      </svg>
    ),
  },
  {
    href: '/editor',
    label: 'Draft Editor',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <path d="M2 12l2-2 8-8 2 2-8 8-2 2z" />
        <path d="M10 4l2 2" />
      </svg>
    ),
  },
]

const ACCOUNT_NAV = [
  {
    href: '/billing',
    label: 'Billing & Plan',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <rect x="1" y="3" width="14" height="10" rx="2" />
        <path d="M1 6h14" />
        <path d="M4 10h3" />
      </svg>
    ),
  },
]

const TOOLS_NAV = [
  {
    href: '/debug',
    label: 'Debug',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v4M8 11v.5" />
      </svg>
    ),
  },
]

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 16px',
        margin: '1px 8px',
        borderRadius: '10px',
        color: active ? '#ffffff' : hovered ? '#ffffff' : 'rgba(255,255,255,0.72)',
        background: active ? 'rgba(255,255,255,0.13)' : hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
        fontSize: '13px',
        fontWeight: 500,
        textDecoration: 'none',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <span style={{ opacity: active ? 1 : 0.8, flexShrink: 0 }}>{icon}</span>
      {label}
    </Link>
  )
}

interface BillingState {
  status: string | null
  trial_ends_at: string | null
  current_period_end: string | null
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string>('')
  const [signOutHovered, setSignOutHovered] = useState(false)
  const [billing, setBilling] = useState<BillingState | null>(null)

  // Hide Debug nav in production. Set NEXT_PUBLIC_SHOW_DEBUG_NAV=1 to override.
  const showDebug =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_SHOW_DEBUG_NAV === '1'

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
      if (!user) return
      // Fetch billing state (RLS scopes to the caller's firm)
      const { data: userRow } = await supabase
        .from('users')
        .select('firm_id')
        .eq('id', user.id)
        .single()
      if (!userRow?.firm_id) return
      const { data: firm } = await supabase
        .from('firms')
        .select('subscription_status, trial_ends_at, current_period_end')
        .eq('id', userRow.firm_id)
        .single()
      if (firm) {
        setBilling({
          status: firm.subscription_status ?? null,
          trial_ends_at: firm.trial_ends_at ?? null,
          current_period_end: firm.current_period_end ?? null,
        })
      }
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Bypass sidebar on onboarding pages
  const isOnboarding = pathname?.startsWith('/onboarding')
  if (isOnboarding) return <>{children}</>

  // Compute trial-expiry banner state
  const now = Date.now()
  const trialEnds = billing?.trial_ends_at ? new Date(billing.trial_ends_at).getTime() : null
  const status = billing?.status
  const trialExpired = trialEnds !== null && trialEnds < now
  const isPastDue = status === 'past_due' || status === 'unpaid'
  const isCanceled = status === 'canceled' || status === null
  // Show banner if past due, OR (trial expired AND no active subscription)
  const showBanner =
    isPastDue ||
    (trialExpired && (isCanceled || status === 'trialing'))

  let bannerText = ''
  if (isPastDue) bannerText = 'Your payment is past due. Update your card to continue.'
  else if (showBanner) bannerText = 'Your free trial has ended. Upgrade to continue using Draftiro.'

  const username = userEmail ? userEmail.split('@')[0] : ''
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '??'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── SIDEBAR ── */}
      <aside
        style={{
          width: '228px',
          background: '#141412',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '24px 20px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              background: '#C9A84C',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Newsreader, serif',
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            D
          </div>
          <span
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: '15px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.3px',
            }}
          >
            Draftiro
          </span>
        </div>

        {/* Nav */}
        <div style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
          {/* WORKSPACE section */}
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
              padding: '20px 24px 8px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Workspace
          </div>
          <nav>
            {WORKSPACE_NAV.map(({ href, label, icon }) => {
              const active =
                pathname === href ||
                (href !== '/dashboard' && pathname?.startsWith(href))
              return (
                <NavItem key={href} href={href} label={label} icon={icon} active={!!active} />
              )
            })}
          </nav>

          {/* ACCOUNT section */}
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
              padding: '20px 24px 8px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Account
          </div>
          <nav>
            {ACCOUNT_NAV.map(({ href, label, icon }) => {
              const active = pathname === href || pathname?.startsWith(href)
              return (
                <NavItem key={href} href={href} label={label} icon={icon} active={!!active} />
              )
            })}
          </nav>

          {/* TOOLS section — dev only */}
          {showDebug && (
            <>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.28)',
                  padding: '20px 24px 8px',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Tools
              </div>
              <nav>
                {TOOLS_NAV.map(({ href, label, icon }) => {
                  const active = pathname === href || pathname?.startsWith(href)
                  return (
                    <NavItem key={href} href={href} label={label} icon={icon} active={!!active} />
                  )
                })}
              </nav>
            </>
          )}
        </div>

        {/* Bottom user block */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* User info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
              padding: '4px 0',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ffffff',
                flexShrink: 0,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.8)',
                  fontFamily: 'DM Sans, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {username || 'User'}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: 'DM Sans, sans-serif',
                  marginTop: '1px',
                }}
              >
                Solo Practice
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            onMouseEnter={() => setSignOutHovered(true)}
            onMouseLeave={() => setSignOutHovered(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: signOutHovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
              fontSize: '12px',
              padding: '6px 4px',
              transition: 'color 0.18s cubic-bezier(0.4,0,0.2,1)',
              fontFamily: 'DM Sans, sans-serif',
              textAlign: 'left',
            }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="13"
              height="13"
              style={{ flexShrink: 0 }}
            >
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#F7F6F3',
        }}
      >
        {showBanner && pathname !== '/billing' && (
          <div
            style={{
              background: 'linear-gradient(90deg, #C9A84C 0%, #B89540 100%)',
              color: '#1D1D1F',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              flexShrink: 0,
            }}
          >
            <span>{bannerText}</span>
            <Link
              href="/billing"
              style={{
                background: '#0F0F0E',
                color: '#fff',
                padding: '5px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Upgrade now →
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
