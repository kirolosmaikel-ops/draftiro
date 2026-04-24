import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe, getPriceId } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  console.log('[stripe/checkout] ▶ request received')

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  // Verify user session
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { plan?: string; annual?: boolean }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const plan = (['solo', 'practice', 'firm'].includes(body.plan ?? '') ? body.plan : 'practice') as 'solo' | 'practice' | 'firm'
  const annual = body.annual === true

  const priceId = getPriceId(plan, annual)
  if (!priceId) {
    console.error('[stripe/checkout] missing price ID for plan:', plan, 'annual:', annual)
    return NextResponse.json({ error: `Stripe price ID not configured for plan: ${plan}. Add STRIPE_${plan.toUpperCase()}_${annual ? 'ANNUAL_' : ''}PRICE_ID to environment variables.` }, { status: 500 })
  }

  // Get firm data
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userRow } = await service.from('users').select('firm_id').eq('id', user.id).single()
  if (!userRow?.firm_id) {
    return NextResponse.json({ error: 'No firm found for user' }, { status: 400 })
  }

  const { data: firmRow } = await service.from('firms').select('stripe_customer_id, name').eq('id', userRow.firm_id).single()

  // Create or retrieve Stripe customer
  let customerId = firmRow?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: firmRow?.name ?? user.email,
      metadata: { firm_id: userRow.firm_id, user_id: user.id },
    })
    customerId = customer.id
    await service.from('firms').update({ stripe_customer_id: customerId }).eq('id', userRow.firm_id)
    console.log('[stripe/checkout] created Stripe customer:', customerId)
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { firm_id: userRow.firm_id, plan },
    },
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { firm_id: userRow.firm_id, plan },
    allow_promotion_codes: true,
  })

  console.log('[stripe/checkout] created session:', session.id)
  return NextResponse.json({ url: session.url })
}
