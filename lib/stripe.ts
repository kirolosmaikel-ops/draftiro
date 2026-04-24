import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY not set — Stripe features will fail')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')

/** Map plan name → Stripe price ID from environment */
export function getPriceId(plan: 'solo' | 'practice' | 'firm', annual = false): string {
  const key = annual
    ? `STRIPE_${plan.toUpperCase()}_ANNUAL_PRICE_ID`
    : `STRIPE_${plan.toUpperCase()}_PRICE_ID`
  return process.env[key] ?? ''
}

export const PLANS = {
  solo: {
    name: 'Solo',
    monthly: 59,
    annual: 47,
    tagline: 'For the attorney just getting started',
    features: [
      { text: '10 active cases', included: true },
      { text: '50 document uploads / month', included: true },
      { text: '500 AI chat messages / month', included: true },
      { text: 'Document Q&A with citations', included: true },
      { text: '3 draft exports (DOCX/PDF)', included: true },
      { text: '14-day free trial', included: true },
      { text: 'Unlimited cases', included: false },
      { text: 'AI legal research', included: false },
      { text: 'Priority processing', included: false },
    ],
  },
  practice: {
    name: 'Practice',
    monthly: 119,
    annual: 95,
    tagline: 'For a thriving solo practice',
    popular: true,
    features: [
      { text: 'Unlimited cases', included: true },
      { text: '500 document uploads / month', included: true },
      { text: 'Unlimited AI chat', included: true },
      { text: 'Document Q&A with citations', included: true },
      { text: 'Unlimited draft exports', included: true },
      { text: 'AI legal research', included: true },
      { text: 'AI clause suggestions', included: true },
      { text: 'Priority document processing', included: true },
      { text: '14-day free trial', included: true },
    ],
  },
  firm: {
    name: 'Firm',
    monthly: 249,
    annual: 199,
    tagline: 'For practices ready to scale',
    features: [
      { text: 'Everything in Practice', included: true },
      { text: 'Up to 5 team members', included: true },
      { text: '2,000 document uploads / month', included: true },
      { text: 'Dedicated support (email + chat)', included: true },
      { text: 'Custom AI persona / firm branding', included: true },
      { text: 'API access', included: true },
      { text: 'Usage analytics dashboard', included: true },
      { text: 'SSO (coming soon)', included: true },
      { text: '14-day free trial', included: true },
    ],
  },
} as const
