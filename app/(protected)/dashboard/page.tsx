'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Case {
  id: string
  title: string
  case_number: string | null
  status: string
  practice_area: string | null
  updated_at: string
}

interface FirmData {
  subscription_status: string | null
  trial_ends_at: string | null
  stripe_plan: string | null
}

const STATUS_COLOR: Record<string, string> = {
  active: '#1A7A4A',
  pending: '#FF9F0A',
  closed: '#9A9A96',
  archived: '#C8C8C4',
}
const STATUS_DOT: Record<string, string> = {
  active: '#34C759',
  pending: '#FF9F0A',
  closed: '#9A9A96',
  archived: '#C8C8C4',
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function CaseCard({ c }: { c: Case }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={`/chat?case=${c.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        border: `1px solid ${hovered ? '#C8C8C4' : 'rgba(0,0,0,0.07)'}`,
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.05)',
        textDecoration: 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_DOT[c.status] ?? '#9A9A96', flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F0F0E', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.title}
        </div>
        <div style={{ fontSize: '11.5px', color: '#9A9A96', marginTop: '2px', fontFamily: 'DM Sans, sans-serif' }}>
          {c.practice_area ?? 'General'}
          {c.case_number ? ` · ${c.case_number}` : ''}
          {' · Updated '}
          {new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
      <span style={{
        fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px',
        background: c.status === 'active' ? '#E8F5EE' : '#F7F6F3',
        color: STATUS_COLOR[c.status] ?? '#6B6B68',
        fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
      }}>
        {c.status}
      </span>
      <svg style={{ color: '#C8C8C4', flexShrink: 0 }} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4l4 4-4 4" />
      </svg>
    </Link>
  )
}

function QuickActionBtn({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#0F0F0E' : '#ffffff',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontSize: '12.5px', fontWeight: 600,
        color: hovered ? '#ffffff' : '#3A3A38',
        display: 'flex', alignItems: 'center', gap: '10px',
        textDecoration: 'none',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <span style={{ flexShrink: 0, opacity: hovered ? 0.9 : 0.65 }}>{icon}</span>
      {label}
    </Link>
  )
}

export default function DashboardPage() {
  const supabase = createClient()

  const [userEmail, setUserEmail] = useState('')
  const [cases, setCases] = useState<Case[]>([])
  const [docCount, setDocCount] = useState(0)
  const [firm, setFirm] = useState<FirmData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [activity, setActivity] = useState<{ time: string; text: string; href?: string }[]>([])

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUserEmail(user?.email ?? '')

        const [casesRes, docsRes] = await Promise.all([
          supabase
            .from('cases')
            .select('id,title,case_number,status,practice_area,updated_at')
            .order('updated_at', { ascending: false })
            .limit(5),
          supabase.from('documents').select('id', { count: 'exact', head: true }),
        ])

        setCases(casesRes.data ?? [])
        setDocCount(docsRes.count ?? 0)

        // Activity feed: most recent docs, sessions, drafts (5 each, then merge)
        const [docsList, sessionsList, draftsList] = await Promise.all([
          supabase.from('documents').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('chat_sessions').select('id, title, case_id, updated_at').order('updated_at', { ascending: false }).limit(5),
          supabase.from('drafts').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
        ])
        type Item = { ts: number; time: string; text: string; href?: string }
        const items: Item[] = []
        ;(docsList.data ?? []).forEach(d => items.push({
          ts: new Date(d.created_at).getTime(),
          time: relTime(d.created_at),
          text: `Uploaded ${d.name}`,
          href: '/knowledge',
        }))
        ;(sessionsList.data ?? []).forEach(s => items.push({
          ts: new Date(s.updated_at).getTime(),
          time: relTime(s.updated_at),
          text: `Chat: ${s.title ?? 'Untitled'}`,
          href: `/chat?session=${s.id}`,
        }))
        ;(draftsList.data ?? []).forEach(d => items.push({
          ts: new Date(d.updated_at).getTime(),
          time: relTime(d.updated_at),
          text: `Drafted ${d.title ?? 'Untitled'}`,
          href: '/editor',
        }))
        items.sort((a, b) => b.ts - a.ts)
        setActivity(items.slice(0, 8).map(i => ({ time: i.time, text: i.text, href: i.href })))

        // Load firm data for trial banner
        if (user) {
          try {
            const { data: userRow } = await supabase
              .from('users')
              .select('firm_id')
              .eq('id', user.id)
              .single()
            if (userRow?.firm_id) {
              const { data: firmRow } = await supabase
                .from('firms')
                .select('subscription_status,trial_ends_at,stripe_plan')
                .eq('id', userRow.firm_id)
                .single()
              setFirm(firmRow ?? null)
            }
          } catch {
            // Non-fatal: trial banner won't show
          }
        }
      } catch (err) {
        console.error('[dashboard] load error:', err)
        setDataError('Failed to load dashboard data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Trial days remaining
  const trialDaysLeft = firm?.subscription_status === 'trial' && firm.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(firm.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const username = userEmail ? userEmail.split('@')[0] : ''
  const displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : ''

  const activeCases = cases.filter(c => c.status === 'active')
  const pendingCases = cases.filter(c => c.status === 'pending')

  const statCards = [
    { num: activeCases.length.toString(), label: 'Active Cases', change: 'Ongoing matters', changeColor: '#1A7A4A', href: '/cases' },
    { num: pendingCases.length.toString(), label: 'Due This Week', change: pendingCases.length > 0 ? 'Needs attention' : 'All clear', changeColor: pendingCases.length > 0 ? '#A0281A' : '#1A7A4A', href: '/cases' },
    { num: docCount.toString(), label: 'Documents', change: 'In knowledge base', changeColor: '#1A4FBF', href: '/knowledge' },
    { num: '0', label: 'AI Drafts Ready', change: 'Create a new draft', changeColor: '#6B6B68', href: '/editor' },
  ]

  const activityItems = activity

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        height: '52px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: '14px',
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F0F0E', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
          Dashboard
        </span>
        {/* Global search hidden until backend search is wired */}
        <div style={{ flex: 1 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/chat" style={{ background: '#0F0F0E', color: '#ffffff', border: 'none', borderRadius: '99px', padding: '0 16px', height: '32px', fontSize: '12.5px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 2v12M2 8h12" /></svg>
            New Chat
          </Link>
        </div>
      </div>

      {/* ── TRIAL BANNER ── */}
      {trialDaysLeft !== null && (
        <div style={{
          margin: '16px 24px 0',
          padding: '12px 18px',
          background: trialDaysLeft <= 3 ? 'rgba(160,40,26,0.06)' : 'rgba(201,168,76,0.1)',
          border: `1px solid ${trialDaysLeft <= 3 ? 'rgba(160,40,26,0.2)' : 'rgba(201,168,76,0.3)'}`,
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>{trialDaysLeft <= 3 ? '⚠️' : '⏰'}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: trialDaysLeft <= 3 ? '#A0281A' : '#8B6914', fontFamily: 'DM Sans, sans-serif' }}>
              {trialDaysLeft === 0
                ? 'Your free trial has expired.'
                : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your free trial.`}
            </span>
          </div>
          <Link href="/pricing" style={{
            background: '#C9A84C', color: '#0F0F0E', borderRadius: '99px', padding: '6px 16px',
            fontSize: '12.5px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            Upgrade Now →
          </Link>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>

          {/* Error state */}
          {dataError && (
            <div style={{ padding: '14px 18px', background: '#FFE8E6', border: '1px solid #FFBDBA', borderRadius: '14px', marginBottom: '20px', fontSize: '13.5px', color: '#A0281A', fontFamily: 'DM Sans, sans-serif' }}>
              ⚠ {dataError}
            </div>
          )}

          {/* Greeting */}
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', color: '#0F0F0E', marginBottom: '4px', marginTop: 0 }}>
            {greeting}{displayName ? `, ${displayName}` : ''}.
          </h1>
          <p style={{ fontSize: '13.5px', color: '#6B6B68', marginBottom: '28px', marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{activeCases.length} active case{activeCases.length !== 1 ? 's' : ''}
          </p>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '32px' }}>
            {statCards.map((card, i) => (
              <Link
                key={card.label}
                href={card.href}
                className={`stagger-${i + 1}`}
                style={{
                  background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '20px',
                  padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', fontWeight: 700, color: '#0F0F0E', letterSpacing: '-1px', lineHeight: 1 }}>
                  {loading ? (
                    <span className="skeleton-pill" style={{
                      display: 'inline-block', width: '48px', height: '32px',
                      borderRadius: '10px',
                      background: 'linear-gradient(90deg, #EAEAE6 25%, #F2F1ED 50%, #EAEAE6 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.4s linear infinite',
                    }} />
                  ) : card.num}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9A9A96', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '5px', fontFamily: 'DM Sans, sans-serif' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: card.changeColor, marginTop: '6px', fontFamily: 'DM Sans, sans-serif' }}>
                  {card.change} →
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Cases */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F0F0E', letterSpacing: '-0.2px', fontFamily: 'DM Sans, sans-serif' }}>Recent Cases</span>
            <Link href="/cases" style={{ fontSize: '13px', fontWeight: 600, color: '#1A4FBF', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>View all →</Link>
          </div>

          {loading ? (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#9A9A96', fontSize: '13.5px', fontFamily: 'DM Sans, sans-serif' }}>
              Loading cases…
            </div>
          ) : cases.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#9A9A96', fontSize: '13.5px', fontFamily: 'DM Sans, sans-serif' }}>
              No cases yet.{' '}
              <Link href="/cases" style={{ color: '#1A4FBF', textDecoration: 'none', fontWeight: 700 }}>Create your first case →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cases.map(c => <CaseCard key={c.id} c={c} />)}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <aside style={{ width: '260px', background: '#F7F6F3', borderLeft: '1px solid rgba(0,0,0,0.07)', padding: '24px 20px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F0F0E', marginBottom: '16px', fontFamily: 'DM Sans, sans-serif' }}>
            Today&apos;s AI Activity
          </div>
          {activityItems.length > 0 ? (
            <div style={{ borderLeft: '2px solid #C9A84C', paddingLeft: '14px', marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activityItems.map((item, i) => {
                const inner = (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-19px', top: '5px', width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C' }} />
                    <div style={{ fontSize: '11px', color: '#9A9A96', fontFamily: 'DM Sans, sans-serif', marginBottom: '2px' }}>{item.time}</div>
                    <div style={{ fontSize: '12.5px', color: '#3A3A38', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4 }}>{item.text}</div>
                  </div>
                )
                return item.href
                  ? <Link key={i} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
                  : <div key={i}>{inner}</div>
              })}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#9A9A96', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, marginBottom: '28px', padding: '12px 14px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px', border: '1px dashed rgba(0,0,0,0.08)' }}>
              Your activity will appear here as you upload documents, chat, and draft.
            </div>
          )}
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F0F0E', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <QuickActionBtn href="/chat" label="New Document Chat" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1z" /></svg>} />
            <QuickActionBtn href="/editor" label="Start a Draft" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12l2-2 8-8 2 2-8 8-2 2z" /><path d="M10 4l2 2" /></svg>} />
            <QuickActionBtn href="/knowledge" label="Knowledge Base" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M5 5h6M5 8h6M5 11h4" /></svg>} />
            <QuickActionBtn href="/billing" label="Billing & Plan" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="14" height="9" rx="1" /><path d="M1 7h14" /></svg>} />
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
