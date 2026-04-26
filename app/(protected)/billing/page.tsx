'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface BillingData {
  subscription_status: string
  stripe_plan: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
}

const PLAN_DISPLAY: Record<string, { name: string; monthly: number }> = {
  solo: { name: 'Solo', monthly: 59 },
  practice: { name: 'Practice', monthly: 119 },
  firm: { name: 'Firm', monthly: 249 },
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  trial: { bg: 'rgba(201,168,76,0.12)', color: '#8B6914', label: 'Free Trial' },
  active: { bg: 'rgba(26,122,74,0.1)', color: '#1A7A4A', label: 'Active' },
  past_due: { bg: '#FFE8E6', color: '#A0281A', label: 'Past Due' },
  canceled: { bg: '#F7F6F3', color: '#9A9A96', label: 'Canceled' },
  paused: { bg: '#F7F6F3', color: '#6B6B68', label: 'Paused' },
}

export default function BillingPage() {
  const supabase = createClient()
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userRow } = await supabase.from('users').select('firm_id').eq('id', user.id).single()
        if (!userRow?.firm_id) return

        const { data: firmRow } = await supabase
          .from('firms')
          .select('subscription_status,stripe_plan,trial_ends_at,current_period_end,stripe_customer_id')
          .eq('id', userRow.firm_id)
          .single()

        setBilling(firmRow ?? null)
      } catch (err) {
        console.error('[billing] load error:', err)
        setError('Failed to load billing information.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        alert(json.error ?? 'Could not open billing portal.')
        setPortalLoading(false)
      }
    } catch {
      alert('Failed to open billing portal. Please try again.')
      setPortalLoading(false)
    }
  }

  const status = billing?.subscription_status ?? 'trial'
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.trial
  const plan = billing?.stripe_plan ? PLAN_DISPLAY[billing.stripe_plan] : null

  const trialDaysLeft = billing?.subscription_status === 'trial' && billing.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(billing.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  const periodEnd = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const trialEnd = billing?.trial_ends_at
    ? new Date(billing.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Topbar */}
      <div style={{ height: '52px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', padding: '0 28px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F0F0E' }}>Billing & Subscription</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 36px 120px' }}>
        <div style={{ maxWidth: '680px' }}>

          {error && (
            <div style={{ padding: '14px 18px', background: '#FFE8E6', border: '1px solid #FFBDBA', borderRadius: '14px', marginBottom: '24px', fontSize: '13.5px', color: '#A0281A' }}>
              ⚠ {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Skeleton: trial banner */}
              <div className="bill-skel" style={{ height: '88px', borderRadius: '16px' }} />
              {/* Skeleton: plan card */}
              <div className="bill-skel" style={{ height: '180px', borderRadius: '16px' }} />
              {/* Skeleton: features list */}
              <div className="bill-skel" style={{ height: '220px', borderRadius: '16px' }} />
              <style>{`
                .bill-skel {
                  background: linear-gradient(90deg, #EAEAE6 25%, #F2F1ED 50%, #EAEAE6 75%);
                  background-size: 200% 100%;
                  animation: bill-shimmer 1.4s linear infinite;
                }
                @keyframes bill-shimmer {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }
              `}</style>
            </div>
          ) : (
            <>
              {/* Trial banner */}
              {status === 'trial' && trialDaysLeft !== null && (
                <div style={{ background: trialDaysLeft <= 3 ? 'rgba(160,40,26,0.06)' : 'rgba(201,168,76,0.1)', border: `1px solid ${trialDaysLeft <= 3 ? 'rgba(160,40,26,0.2)' : 'rgba(201,168,76,0.3)'}`, borderRadius: '16px', padding: '18px 22px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: trialDaysLeft <= 3 ? '#A0281A' : '#8B6914', marginBottom: '4px' }}>
                      {trialDaysLeft === 0 ? '⚠️ Your trial has expired' : `⏰ ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your free trial`}
                    </div>
                    {trialEnd && <div style={{ fontSize: '12.5px', color: '#9A9A96' }}>Trial ends {trialEnd}</div>}
                    {/* Progress bar */}
                    <div style={{ marginTop: '10px', height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '99px', width: '240px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: trialDaysLeft <= 3 ? '#A0281A' : '#C9A84C', borderRadius: '99px', width: `${Math.max(5, ((14 - (trialDaysLeft ?? 0)) / 14) * 100)}%` }} />
                    </div>
                  </div>
                  <Link href="/pricing" style={{ background: '#C9A84C', color: '#0F0F0E', borderRadius: '99px', padding: '10px 20px', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Upgrade Now →
                  </Link>
                </div>
              )}

              {/* Current plan card */}
              <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '20px', padding: '28px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#9A9A96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Current Plan</div>
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: '26px', fontWeight: 700, color: '#0F0F0E', letterSpacing: '-0.5px' }}>
                      {plan ? plan.name : 'Free Trial'}
                    </div>
                    {plan && (
                      <div style={{ fontSize: '14px', color: '#6B6B68', marginTop: '4px' }}>${plan.monthly}/month</div>
                    )}
                  </div>
                  <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: '99px', padding: '5px 14px', fontSize: '12px', fontWeight: 700 }}>
                    {statusStyle.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', padding: '20px', background: '#F7F6F3', borderRadius: '14px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9A9A96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Status</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: statusStyle.color }}>{statusStyle.label}</div>
                  </div>
                  {periodEnd && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#9A9A96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Next Billing Date</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F0F0E' }}>{periodEnd}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {billing?.stripe_customer_id && (
                    <button
                      type="button"
                      onClick={openPortal}
                      disabled={portalLoading}
                      style={{ height: '44px', background: '#0F0F0E', color: '#fff', border: 'none', borderRadius: '99px', padding: '0 22px', fontSize: '14px', fontWeight: 700, cursor: portalLoading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: portalLoading ? 0.7 : 1 }}
                    >
                      {portalLoading ? 'Opening…' : 'Manage Billing →'}
                    </button>
                  )}
                  <Link
                    href="/pricing"
                    style={{ height: '44px', background: status === 'trial' ? '#C9A84C' : '#F7F6F3', color: status === 'trial' ? '#0F0F0E' : '#3A3A38', borderRadius: '99px', padding: '0 22px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    {status === 'trial' ? 'Start Subscription →' : 'View Plans'}
                  </Link>
                </div>
              </div>

              {/* What's included */}
              <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F0F0E', marginBottom: '16px' }}>What&apos;s Included</div>
                {[
                  { label: 'AI Document Chat', value: 'Unlimited' },
                  { label: 'Cases', value: plan?.name === 'Solo' ? 'Up to 10' : 'Unlimited' },
                  { label: 'Document Uploads', value: plan?.name === 'Firm' ? '2,000/mo' : '500/mo' },
                  { label: 'Draft Exports', value: plan?.name === 'Solo' ? '3/month' : 'Unlimited' },
                  { label: 'Team Members', value: plan?.name === 'Firm' ? 'Up to 5' : '1 (solo)' },
                  { label: 'Support', value: plan?.name === 'Firm' ? 'Priority email + chat' : 'Email' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '13.5px', color: '#3A3A38' }}>{item.label}</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F0F0E' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Help */}
              <p style={{ fontSize: '12.5px', color: '#9A9A96', textAlign: 'center', marginTop: '24px', lineHeight: 1.6 }}>
                Questions? Email <a href="mailto:support@draftiro.com" style={{ color: '#1A4FBF' }}>support@draftiro.com</a>
                {' · '}
                <Link href="/cancellation" style={{ color: '#1A4FBF', textDecoration: 'none' }}>Cancellation Policy</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
