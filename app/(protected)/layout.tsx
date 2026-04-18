'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
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
        <rect x="1" y="4" width="14" height="10" rx="1" /><path d="M5 4V3a2 2 0 014 0v1" />
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
        <path d="M2 12l2-2 8-8 2 2-8 8-2 2z" /><path d="M10 4l2 2" />
      </svg>
    ),
  },
]

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Don't show sidebar on onboarding pages
  const isOnboarding = pathname?.startsWith('/onboarding')
  if (isOnboarding) return <>{children}</>

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '228px', background: '#141412', display: 'flex',
        flexDirection: 'column', height: '100vh', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px', display: 'flex', alignItems: 'center',
          gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: '28px', height: '28px', background: '#C9A84C', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '14px',
          }}>L</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
            LegalMind
          </span>
        </div>

        {/* Nav */}
        <div style={{ padding: '8px 0', flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', padding: '20px 20px 8px' }}>
            Workspace
          </div>
          <nav>
            {NAV.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
              return (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 16px', margin: '1px 8px', borderRadius: '10px',
                  color: active ? '#fff' : 'rgba(255,255,255,0.72)',
                  background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
                  fontSize: '13px', fontWeight: 500, textDecoration: 'none',
                  transition: 'all 0.18s ease',
                }}>
                  <span style={{ opacity: active ? 1 : 0.8 }}>{icon}</span>
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontSize: '12px', padding: '6px 0',
            transition: 'color 0.18s ease', fontFamily: 'Manrope, sans-serif',
          }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F7F6F3' }}>
        {children}
      </main>
    </div>
  )
}
