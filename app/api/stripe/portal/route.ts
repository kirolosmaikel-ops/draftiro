import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  console.log('[stripe/portal] ▶ request received')

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userRow } = await service.from('users').select('firm_id').eq('id', user.id).single()
  if (!userRow?.firm_id) {
    return NextResponse.json({ error: 'No firm found' }, { status: 400 })
  }

  const { data: firmRow } = await service
    .from('firms')
    .select('stripe_customer_id')
    .eq('id', userRow.firm_id)
    .single()

  if (!firmRow?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found. Please subscribe first.' }, { status: 400 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: firmRow.stripe_customer_id,
    return_url: `${origin}/billing`,
  })

  console.log('[stripe/portal] created portal session')
  return NextResponse.json({ url: portalSession.url })
}
