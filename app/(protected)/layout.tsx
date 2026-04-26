'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CommandPalette } from '@/components/CommandPalette'
import { OnboardingModal } from '@/components/OnboardingModal'

// ── Nav definitions ────────────────────────────────────────────────────────
const ICON = {
  dashboard: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
      <path d="M2 2h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1z" />
    </svg>
  ),
  cases: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
      <rect x="1" y="4" width="14" height="10" rx="1" />
      <path d="M5 4V3a2 2 0 014 0v1" />
    </svg>
  ),
  knowledge: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
      <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M5 5h6M5 8h6M5 11h4" />
    </svg>
  ),
  editor: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
      <path d="M2 12l2-2 8-8 2 2-8 8-2 2z" />
      <path d="M10 4l2 2" />
    </svg>
  ),
  billing: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M1 6h14" />
      <path d="M4 10h3" />
    </svg>
  ),
  debug: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="18" height="18">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v4M8 11v.5" />
    </svg>
  ),
}

const DOCK_PRIMARY = [
  { href: '/dashboard', label: 'Dashboard', icon: ICON.dashboard },
  { href: '/cases',     label: 'Cases',     icon: ICON.cases },
  { href: '/chat',      label: 'Chat',      icon: ICON.chat },
  { href: '/knowledge', label: 'Knowledge', icon: ICON.knowledge },
  { href: '/editor',    label: 'Draft',     icon: ICON.editor },
]
const DOCK_SECONDARY = [
  { href: '/billing',   label: 'Billing',   icon: ICON.billing },
]

// ── Dock icon button ───────────────────────────────────────────────────────
function DockBtn({ href, label, icon, active, onClick }: {
  href?: string
  label: string
  icon: React.ReactNode
  active: boolean
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const inner = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        position: 'relative',
        width: '44px',
        height: '44px',
        borderRadius: '14px',
        background: active ? 'rgba(255,255,255,0.18)' : hovered ? 'rgba(255,255,255,0.10)' : 'transparent',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.18s ease, transform 0.18s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'translateY(-2px) scale(1.06)' : 'translateY(0) scale(1)',
      }}
    >
      {icon}
      {hovered && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,15,14,0.95)',
          color: '#fff',
          fontSize: '11.5px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: '7px',
          whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}>
          {label}
        </span>
      )}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

const hKbd: React.CSSProperties = {
  background: 'rgba(0,0,0,0.05)',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '5px',
  padding: '1px 6px',
  fontSize: '11px',
  fontFamily: 'inherit',
  color: '#3A3A38',
  marginLeft: '3px',
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
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const showDebug =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_SHOW_DEBUG_NAV === '1'

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
      if (!user) return
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

  // Global keyboard nav (Cmd/Ctrl + 1..6 to dock items, ? to open help)
  const [showHelp, setShowHelp] = useState(false)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
      // ? help sheet (only when not typing)
      if (e.key === '?' && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowHelp(true)
      }
      if (e.key === 'Escape') setShowHelp(false)
      // Cmd/Ctrl + 1..6 → dock items (always works)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const map: Record<string, string> = {
          '1': '/dashboard', '2': '/cases', '3': '/chat',
          '4': '/knowledge', '5': '/editor', '6': '/billing',
        }
        const href = map[e.key]
        if (href) { e.preventDefault(); router.push(href) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  // Close user popover on outside click
  useEffect(() => {
    if (!showUserMenu) return
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showUserMenu])

  async function signOut() {
    setShowUserMenu(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Bypass layout chrome on onboarding pages
  const isOnboarding = pathname?.startsWith('/onboarding')
  if (isOnboarding) return <>{children}</>

  // Trial banner
  const now = Date.now()
  const trialEnds = billing?.trial_ends_at ? new Date(billing.trial_ends_at).getTime() : null
  const status = billing?.status
  const trialExpired = trialEnds !== null && trialEnds < now
  const isPastDue = status === 'past_due' || status === 'unpaid'
  const isCanceled = status === 'canceled' || status === null
  const showBanner =
    isPastDue ||
    (trialExpired && (isCanceled || status === 'trialing'))

  let bannerText = ''
  if (isPastDue) bannerText = 'Your payment is past due. Update your card to continue.'
  else if (showBanner) bannerText = 'Your free trial has ended. Upgrade to continue using Draftiro.'

  const username = userEmail ? userEmail.split('@')[0] : ''
  const initials = username ? username.slice(0, 2).toUpperCase() : '·'

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
  }

  return (
    <div style={{ height: '100vh', background: '#F7F6F3', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Trial banner at top */}
      {showBanner && pathname !== '/billing' && (
        <div style={{
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
        }}>
          <span>{bannerText}</span>
          <Link
            href="/billing"
            style={{
              background: '#0F0F0E', color: '#fff',
              padding: '5px 14px', borderRadius: '6px',
              fontSize: '12px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Main content — full width. Pages own their own scroll. The dock is
          fixed so doesn't displace content; we just leave a hidden gutter via
          a transparent spacer at the bottom of each page (rendered by pages
          that have a bottom input bar). For dashboard/cases/etc the dock just
          floats over the empty space at page bottom. */}
      <main style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </main>

      {/* ── FLOATING DOCK ─────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: '18px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,15,14,0.78)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '22px',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 50,
        boxShadow: '0 16px 48px rgba(0,0,0,0.32), 0 4px 12px rgba(0,0,0,0.18)',
      }}>
        {DOCK_PRIMARY.map(item => (
          <DockBtn
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
          />
        ))}

        {/* divider */}
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

        {DOCK_SECONDARY.map(item => (
          <DockBtn
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
          />
        ))}

        {showDebug && (
          <DockBtn href="/debug" label="Debug" icon={ICON.debug} active={isActive('/debug')} />
        )}

        {/* User avatar — opens popover above */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowUserMenu(s => !s)}
            title={userEmail || 'Account'}
            style={{
              width: '36px',
              height: '36px',
              marginLeft: '6px',
              borderRadius: '50%',
              background: '#C9A84C',
              color: '#0F0F0E',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {initials}
          </div>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 14px)',
              right: 0,
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)',
              minWidth: '220px',
              padding: '6px',
              fontFamily: 'DM Sans, sans-serif',
              animation: 'fadeUp 0.15s ease',
            }}>
              <div style={{ padding: '10px 12px 8px', fontSize: '12px', color: '#6B6B68', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                Signed in as
                <div
                  title={userEmail}
                  style={{
                    color: '#0F0F0E', fontWeight: 600, fontSize: '13px', marginTop: '2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {userEmail || '—'}
                </div>
              </div>
              <Link
                href="/billing"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'block',
                  padding: '9px 12px',
                  fontSize: '13px',
                  color: '#0F0F0E',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F3')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Billing &amp; plan
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'block',
                  padding: '9px 12px',
                  fontSize: '13px',
                  color: '#0F0F0E',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F7F6F3')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Account settings
              </Link>
              <button
                onClick={signOut}
                style={{
                  display: 'block', width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  color: '#A0281A',
                  background: 'none',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FFE8E6')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Command palette (Cmd/Ctrl+K) */}
      <CommandPalette />

      {/* First-time onboarding (asks name + practice area, once) */}
      <OnboardingModal />

      {/* Keyboard shortcut help (?) */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(15,15,14,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: '16px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.24)',
              padding: '28px 32px', maxWidth: '440px', width: '100%',
              fontFamily: 'DM Sans, system-ui, sans-serif',
            }}
          >
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
              Keyboard shortcuts
            </div>
            <div style={{ fontSize: '12.5px', color: '#9A9A96', marginBottom: '20px' }}>
              Press <kbd style={hKbd}>?</kbd> any time to see this.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['Open command palette', '⌘ K'],
                ['Go to Dashboard',      '⌘ 1'],
                ['Go to Cases',          '⌘ 2'],
                ['Open Chat',            '⌘ 3'],
                ['Open Knowledge',       '⌘ 4'],
                ['Open Editor',          '⌘ 5'],
                ['Open Billing',         '⌘ 6'],
                ['Send chat message',    '↵'],
                ['New line in chat',     'Shift ↵'],
                ['Stop generating',      'Esc'],
                ['Save draft',           '⌘ S'],
              ].map(([label, key]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#3A3A38' }}>{label}</span>
                  <span>
                    {key.split(' ').map((k, i) => <kbd key={i} style={hKbd}>{k}</kbd>)}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: '24px', width: '100%', height: '40px',
                background: '#0F0F0E', color: '#fff', border: 'none',
                borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
