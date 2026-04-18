import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch real data — gracefully fall back to empty arrays if tables don't exist yet
  const [casesRes, docsRes] = await Promise.all([
    supabase
      .from('cases')
      .select('id,title,status,practice_area,updated_at')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase.from('documents').select('id', { count: 'exact', head: true }),
  ])

  const cases = casesRes.data ?? []
  const docCount = docsRes.count ?? 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const statusColor: Record<string, string> = {
    active: '#34C759', pending: '#FF9F0A', closed: '#9A9A96', archived: '#C8C8C4',
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        height: '52px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '12px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>Dashboard</span>
        <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.07)', margin: '0 4px' }} />
        <div style={{ flex: 1, maxWidth: '280px', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9A9A96' }}
            width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3 3" />
          </svg>
          <input placeholder="Search cases, docs, clients…" style={{
            width: '100%', height: '30px', background: '#F7F6F3', border: 'none',
            borderRadius: '10px', padding: '0 12px 0 32px', fontSize: '12.5px',
            fontFamily: 'Manrope, sans-serif', color: '#1D1D1F', outline: 'none',
          }} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/chat" style={{
            background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '0 16px', height: '32px', fontSize: '12.5px', fontWeight: 600,
            fontFamily: 'Manrope, sans-serif', cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: '6px', textDecoration: 'none',
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2v12M2 8h12" />
            </svg>
            New Chat
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
          <h1 style={{
            fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700,
            letterSpacing: '-0.5px', color: '#1D1D1F', marginBottom: '4px',
          }}>
            {greeting}.
          </h1>
          <p style={{ fontSize: '13.5px', color: '#6B6B68', marginBottom: '28px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{cases.length} active case{cases.length !== 1 ? 's' : ''}
          </p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '32px' }}>
            {[
              { num: cases.length.toString(), label: 'Active Cases', change: 'All cases', color: '#1A7A4A' },
              { num: cases.filter(c => c.status === 'pending').length.toString(), label: 'Pending', change: 'Need review', color: '#FF9F0A' },
              { num: docCount.toString(), label: 'Documents', change: 'Total indexed', color: '#1A7A4A' },
              { num: '0', label: 'AI Drafts', change: 'In editor', color: '#6B6B68' },
            ].map(({ num, label, change, color }) => (
              <div key={label} style={{
                background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
                padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: '30px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px' }}>{num}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#9A9A96', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>{label}</div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color, marginTop: '6px' }}>{change}</div>
              </div>
            ))}
          </div>

          {/* Recent cases */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '13px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.2px', marginBottom: '14px',
          }}>
            Recent Cases
            <Link href="/cases" style={{ fontSize: '12px', fontWeight: 500, color: '#1A4FBF', textDecoration: 'none' }}>View all →</Link>
          </div>

          {cases.length === 0 ? (
            <div style={{
              background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
              padding: '40px', textAlign: 'center', color: '#9A9A96', fontSize: '13.5px',
            }}>
              No cases yet.{' '}
              <Link href="/cases" style={{ color: '#1A4FBF', textDecoration: 'none', fontWeight: 600 }}>
                Create your first case →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cases.map((c) => (
                <Link key={c.id} href={`/chat?case=${c.id}`} style={{
                  background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px',
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px',
                  cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none',
                  transition: 'all 0.18s ease',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: statusColor[c.status] ?? '#9A9A96', flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1D1D1F' }}>{c.title}</div>
                    <div style={{ fontSize: '11.5px', color: '#9A9A96', marginTop: '2px' }}>
                      {c.practice_area ?? 'General'} · Updated {new Date(c.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <svg style={{ color: '#C8C8C4' }} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <aside style={{
          width: '260px', background: '#F7F6F3', borderLeft: '1px solid rgba(0,0,0,0.07)',
          padding: '24px 20px', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D1D1F', marginBottom: '16px' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '28px' }}>
            {[
              { href: '/chat', label: 'New Document Chat', icon: '💬' },
              { href: '/editor', label: 'Start a Draft', icon: '✏️' },
              { href: '/knowledge', label: 'Knowledge Base', icon: '📚' },
              { href: '/cases', label: 'Manage Cases', icon: '⚖️' },
            ].map(({ href, label, icon }) => (
              <Link key={href} href={href} style={{
                background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px',
                padding: '10px 14px', fontSize: '12.5px', fontWeight: 500, color: '#3A3A38',
                display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none',
              }}>
                <span>{icon}</span>{label}
              </Link>
            ))}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D1D1F', marginBottom: '8px' }}>Get Started</div>
          <p style={{ fontSize: '12px', color: '#9A9A96', lineHeight: 1.6 }}>
            Upload a case file to begin chatting with your documents using AI.
          </p>
          <Link href="/onboarding/step1" style={{
            display: 'inline-block', marginTop: '12px', fontSize: '12px',
            fontWeight: 600, color: '#d44439', textDecoration: 'none',
          }}>
            Start onboarding →
          </Link>
        </aside>
      </div>
    </div>
  )
}
