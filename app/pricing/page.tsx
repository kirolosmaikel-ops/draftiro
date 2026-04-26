'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PLANS } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/client'

type PlanKey = 'solo' | 'practice' | 'firm'

function PricingContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const [annual, setAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session))
  }, [])

  async function handleCheckout(plan: PlanKey) {
    setCheckoutError('')

    // If not logged in, send them to sign up first
    if (!isLoggedIn) {
      window.location.href = `/login?next=/pricing&plan=${plan}`
      return
    }

    setLoadingPlan(plan)
    try {
      // Pass the access token explicitly so the API route can authenticate
      // even if cookie-based auth has any quirk.
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan, annual }),
      })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        setCheckoutError(json.error ?? `Checkout failed (${res.status})`)
        setLoadingPlan(null)
      }
    } catch (e) {
      console.error('checkout error:', e)
      setCheckoutError(e instanceof Error ? e.message : 'Network error')
      setLoadingPlan(null)
    }
  }

  const plans = [
    { key: 'solo' as PlanKey, data: PLANS.solo },
    { key: 'practice' as PlanKey, data: PLANS.practice },
    { key: 'firm' as PlanKey, data: PLANS.firm },
  ]

  return (
    <div style={{ fontFamily: 'DM Sans, system-ui, sans-serif', color: '#0F0F0E', background: '#fff', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, height: '60px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', padding: '0 48px', gap: '24px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto', textDecoration: 'none' }}>
          <div style={{ width: '30px', height: '30px', background: '#C9A84C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Newsreader, serif', fontWeight: 700, color: '#fff', fontSize: '15px' }}>D</div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '17px', fontWeight: 600, letterSpacing: '-0.3px', color: '#0F0F0E' }}>Draftiro</span>
        </Link>
        <Link href="/login" style={{ height: '36px', background: '#0F0F0E', color: '#fff', borderRadius: '99px', padding: '0 18px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Sign in
        </Link>
      </nav>

      {/* Reason banner */}
      {reason === 'trial_expired' && (
        <div style={{ background: '#FFF3CD', borderBottom: '1px solid #FBBF24', padding: '12px 48px', fontSize: '13.5px', color: '#92400E', textAlign: 'center', fontWeight: 600 }}>
          ⏰ Your free trial has expired. Subscribe to continue using Draftiro.
        </div>
      )}
      {reason === 'subscription_required' && (
        <div style={{ background: '#FFE8E6', borderBottom: '1px solid #FFBDBA', padding: '12px 48px', fontSize: '13.5px', color: '#A0281A', textAlign: 'center', fontWeight: 600 }}>
          ⚠ Your subscription is inactive. Please reactivate to continue.
        </div>
      )}

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 48px 56px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '99px', padding: '5px 14px', marginBottom: '28px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B6914', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Simple Pricing</span>
        </div>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '16px', fontStyle: 'italic' }}>
          Simple, transparent pricing.
        </h1>
        <p style={{ fontSize: '17px', color: '#6B6B68', lineHeight: 1.65, marginBottom: '36px', maxWidth: '480px', margin: '0 auto 40px' }}>
          Start free for 14 days. No credit card required. Cancel anytime.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#F7F6F3', borderRadius: '99px', padding: '4px', gap: '2px', marginBottom: '60px' }}>
          <button
            type="button"
            onClick={() => setAnnual(false)}
            style={{ padding: '8px 22px', fontSize: '13.5px', fontWeight: 600, color: !annual ? '#0F0F0E' : '#9A9A96', background: !annual ? '#fff' : 'transparent', border: 'none', borderRadius: '99px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: !annual ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.18s ease' }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            style={{ padding: '8px 22px', fontSize: '13.5px', fontWeight: 600, color: annual ? '#0F0F0E' : '#9A9A96', background: annual ? '#fff' : 'transparent', border: 'none', borderRadius: '99px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: annual ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.18s ease', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Annual
            <span style={{ background: '#C9A84C', color: '#0F0F0E', borderRadius: '99px', padding: '2px 8px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>SAVE 20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 24px 96px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
        {plans.map(({ key, data }) => {
          const isPopular = 'popular' in data && data.popular
          const price = annual ? data.annual : data.monthly
          const isLoading = loadingPlan === key

          return (
            <div
              key={key}
              style={{
                background: isPopular ? '#0F0F0E' : '#fff',
                borderRadius: '24px',
                padding: '32px',
                border: isPopular ? 'none' : '1px solid rgba(0,0,0,0.07)',
                boxShadow: isPopular
                  ? '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)'
                  : '0 2px 12px rgba(0,0,0,0.06)',
                transform: isPopular ? 'scale(1.03)' : 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative',
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#C9A84C', color: '#0F0F0E', borderRadius: '99px', padding: '5px 16px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  ⭐ Most Popular
                </div>
              )}

              {/* Plan label */}
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#C9A84C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                {data.name}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: '54px', fontWeight: 700, color: isPopular ? '#fff' : '#0F0F0E', letterSpacing: '-2px', lineHeight: 1 }}>
                  ${price}
                </span>
                <span style={{ fontSize: '14px', color: isPopular ? 'rgba(255,255,255,0.5)' : '#9A9A96', marginBottom: '2px' }}>/mo</span>
              </div>
              {annual && (
                <div style={{ fontSize: '12px', color: isPopular ? 'rgba(255,255,255,0.45)' : '#9A9A96', marginBottom: '6px' }}>
                  Billed annually (${price * 12}/yr)
                </div>
              )}

              {/* Tagline */}
              <p style={{ fontSize: '13.5px', color: isPopular ? 'rgba(255,255,255,0.6)' : '#6B6B68', marginBottom: '24px', lineHeight: 1.5 }}>
                {data.tagline}
              </p>

              {/* Divider */}
              <div style={{ height: '1px', background: isPopular ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)', marginBottom: '24px' }} />

              {/* Feature list */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: f.included ? (isPopular ? 'rgba(255,255,255,0.88)' : '#3A3A38') : (isPopular ? 'rgba(255,255,255,0.25)' : '#C8C8C4') }}>
                    <span style={{ flexShrink: 0, marginTop: '1px', fontSize: '14px', color: f.included ? '#34C759' : (isPopular ? 'rgba(255,255,255,0.2)' : '#D1D1D6') }}>
                      {f.included ? '✓' : '✕'}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => handleCheckout(key)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '52px',
                  background: isPopular ? '#C9A84C' : key === 'firm' ? '#0F0F0E' : '#F7F6F3',
                  color: isPopular ? '#0F0F0E' : key === 'firm' ? '#fff' : '#0F0F0E',
                  border: isPopular || key === 'firm' ? 'none' : '1.5px solid rgba(0,0,0,0.12)',
                  borderRadius: '99px',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.75 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'opacity 0.15s ease, transform 0.12s ease',
                }}
              >
                {isLoading
                  ? 'Opening Checkout…'
                  : isLoggedIn
                    ? `Upgrade to ${data.name} →`
                    : `Start Free Trial →`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Inline checkout error banner */}
      {checkoutError && (
        <div style={{
          maxWidth: '720px',
          margin: '24px auto 0',
          padding: '14px 18px',
          borderRadius: '12px',
          background: '#FFE8E6',
          color: '#A0281A',
          border: '1px solid #FFBDBA',
          fontSize: '13.5px',
          lineHeight: 1.55,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          ⚠ {checkoutError}
        </div>
      )}

      {/* FAQ / Trust strip */}
      <div style={{ background: '#F7F6F3', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {[
            { icon: '🔒', title: 'Encrypted end-to-end', desc: 'Your data is encrypted at rest and in transit; hosted on SOC 2 audited infrastructure.' },
            { icon: '↩', title: 'Cancel Anytime', desc: 'No long-term contracts. Cancel from your billing page.' },
            { icon: '⚖️', title: 'Not Legal Advice', desc: 'AI outputs are for research only — always verify with licensed counsel.' },
          ].map(item => (
            <div key={item.title}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F0F0E', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '12.5px', color: '#6B6B68', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#0F0F0E', padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontFamily: 'Newsreader, serif', fontSize: '14px', fontWeight: 600, color: '#fff' }}>Draftiro</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>© 2026 Draftiro. For solo attorneys.</span>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Cancellation', '/cancellation']].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fff' }} />}>
      <PricingContent />
    </Suspense>
  )
}
