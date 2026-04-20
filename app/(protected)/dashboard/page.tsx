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
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
        textDecoration: 'none',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: STATUS_DOT[c.status] ?? '#9A9A96',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#0F0F0E',
            fontFamily: 'DM Sans, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {c.title}
        </div>
        <div
          style={{
            fontSize: '11.5px',
            color: '#9A9A96',
            marginTop: '2px',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {c.practice_area ?? 'General'}
          {c.case_number ? ` · ${c.case_number}` : ''}
          {' · Updated '}
          {new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: '99px',
          background: c.status === 'active' ? '#E8F5EE' : '#F7F6F3',
          color: STATUS_COLOR[c.status] ?? '#6B6B68',
          fontFamily: 'DM Sans, sans-serif',
          flexShrink: 0,
        }}
      >
        {c.status}
      </span>
      <svg
        style={{ color: '#C8C8C4', flexShrink: 0 }}
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
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
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12.5px',
        fontWeight: 500,
        color: hovered ? '#ffffff' : '#3A3A38',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <span style={{ flexShrink: 0, opacity: hovered ? 0.9 : 0.7 }}>{icon}</span>
      {label}
    </Link>
  )
}

export default function DashboardPage() {
  const supabase = createClient()

  const [userEmail, setUserEmail] = useState('')
  const [cases, setCases] = useState<Case[]>([])
  const [docCount, setDocCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
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
      setLoading(false)
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const username = userEmail ? userEmail.split('@')[0] : ''
  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : ''

  const activeCases = cases.filter(c => c.status === 'active')
  const pendingCases = cases.filter(c => c.status === 'pending')

  const statCards = [
    {
      num: activeCases.length.toString(),
      label: 'Active Cases',
      change: '+2 this week',
      changeColor: '#1A7A4A',
    },
    {
      num: pendingCases.length.toString(),
      label: 'Due This Week',
      change: pendingCases.length > 0 ? 'Needs attention' : 'All clear',
      changeColor: pendingCases.length > 0 ? '#A0281A' : '#1A7A4A',
    },
    {
      num: docCount.toString(),
      label: 'Documents',
      change: '12 indexed today',
      changeColor: '#1A7A4A',
    },
    {
      num: '0',
      label: 'AI Drafts Ready',
      change: 'Review pending',
      changeColor: '#6B6B68',
    },
  ]

  const activityItems = [
    { time: '9:14 AM', text: 'AI summarized Chen v. Meridian Corp' },
    { time: '8:52 AM', text: 'Draft contract uploaded to Knowledge Base' },
    { time: 'Yesterday', text: '3 new cases created' },
  ]

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      {/* ── TOPBAR ── */}
      <div
        style={{
          height: '52px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '14px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#0F0F0E',
            fontFamily: 'DM Sans, sans-serif',
            flexShrink: 0,
          }}
        >
          Dashboard
        </span>

        <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.07)', flexShrink: 0 }} />

        {/* Search */}
        <div style={{ flex: 1, maxWidth: '280px', position: 'relative' }}>
          <svg
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9A9A96',
              pointerEvents: 'none',
            }}
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3 3" />
          </svg>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cases, docs, clients…"
            style={{
              width: '100%',
              height: '30px',
              background: '#F7F6F3',
              border: 'none',
              borderRadius: '10px',
              padding: '0 12px 0 32px',
              fontSize: '12.5px',
              fontFamily: 'DM Sans, sans-serif',
              color: '#0F0F0E',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/chat"
            style={{
              background: '#0F0F0E',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0 16px',
              height: '32px',
              fontSize: '12.5px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2v12M2 8h12" />
            </svg>
            New Chat
          </Link>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
          {/* Greeting */}
          <h1
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: '#0F0F0E',
              marginBottom: '4px',
              marginTop: 0,
            }}
          >
            {greeting}{displayName ? `, ${displayName}` : ''}.
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: '#6B6B68',
              marginBottom: '28px',
              marginTop: 0,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}
            {activeCases.length} active case{activeCases.length !== 1 ? 's' : ''}
          </p>

          {/* Stats grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px',
              marginBottom: '32px',
            }}
          >
            {statCards.map((card, i) => (
              <div
                key={card.label}
                className={`stagger-${i + 1}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontSize: '30px',
                    fontWeight: 700,
                    color: '#0F0F0E',
                    letterSpacing: '-1px',
                    lineHeight: 1,
                  }}
                >
                  {loading ? '–' : card.num}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#9A9A96',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginTop: '4px',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: card.changeColor,
                    marginTop: '6px',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {card.change}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Cases header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F0F0E',
                letterSpacing: '-0.2px',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Recent Cases
            </span>
            <Link
              href="/cases"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#1A4FBF',
                textDecoration: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              View all →
            </Link>
          </div>

          {/* Case list */}
          {loading ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                color: '#9A9A96',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Loading cases…
            </div>
          ) : cases.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                borderRadius: '14px',
                padding: '40px',
                textAlign: 'center',
                color: '#9A9A96',
                fontSize: '13.5px',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              No cases yet.{' '}
              <Link
                href="/cases"
                style={{
                  color: '#1A4FBF',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Create your first case →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cases.map(c => (
                <CaseCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <aside
          style={{
            width: '260px',
            background: '#F7F6F3',
            borderLeft: '1px solid rgba(0,0,0,0.07)',
            padding: '24px 20px',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Today's AI Activity */}
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#0F0F0E',
              marginBottom: '16px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Today's AI Activity
          </div>

          <div
            style={{
              borderLeft: '2px solid #C9A84C',
              paddingLeft: '14px',
              marginBottom: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {activityItems.map((item, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-19px',
                    top: '5px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#C9A84C',
                  }}
                />
                <div
                  style={{
                    fontSize: '11px',
                    color: '#9A9A96',
                    fontFamily: 'DM Sans, sans-serif',
                    marginBottom: '2px',
                  }}
                >
                  {item.time}
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    color: '#3A3A38',
                    fontFamily: 'DM Sans, sans-serif',
                    lineHeight: 1.4,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#0F0F0E',
              marginBottom: '10px',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <QuickActionBtn
              href="/chat"
              label="New Document Chat"
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 2h12a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1z" />
                </svg>
              }
            />
            <QuickActionBtn
              href="/editor"
              label="Start a Draft"
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 12l2-2 8-8 2 2-8 8-2 2z" />
                  <path d="M10 4l2 2" />
                </svg>
              }
            />
            <QuickActionBtn
              href="/knowledge"
              label="Knowledge Base"
              icon={
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
                  <path d="M5 5h6M5 8h6M5 11h4" />
                </svg>
              }
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
