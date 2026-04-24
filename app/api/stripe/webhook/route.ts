import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Must read raw body for Stripe signature verification
export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[stripe/webhook] received event:', event.type)

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async function updateFirmByCustomer(customerId: string, updates: Record<string, unknown>) {
    const { error } = await service
      .from('firms')
      .update(updates)
      .eq('stripe_customer_id', customerId)
    if (error) console.error('[stripe/webhook] DB update failed:', error.message)
    else console.log('[stripe/webhook] updated firm for customer:', customerId, updates)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const subAny = sub as unknown as { current_period_end: number; metadata?: Record<string, string> }
      const plan = (session.metadata?.plan ?? subAny.metadata?.plan ?? 'practice') as string

      await updateFirmByCustomer(session.customer as string, {
        subscription_status: 'active',
        stripe_subscription_id: session.subscription,
        stripe_plan: plan,
        current_period_end: new Date(subAny.current_period_end * 1000).toISOString(),
        plan: plan,
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const subAny = sub as unknown as { current_period_end: number }
      const status = sub.status === 'active' ? 'active'
        : sub.status === 'past_due' ? 'past_due'
        : sub.status === 'canceled' ? 'canceled'
        : sub.status === 'paused' ? 'paused'
        : 'active'

      await updateFirmByCustomer(sub.customer as string, {
        subscription_status: status,
        current_period_end: new Date(subAny.current_period_end * 1000).toISOString(),
        stripe_plan: sub.metadata?.plan ?? null,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updateFirmByCustomer(sub.customer as string, {
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        current_period_end: null,
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.customer) {
        await updateFirmByCustomer(invoice.customer as string, {
          subscription_status: 'past_due',
        })
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null }
      if (invoice.customer && invoice.subscription) {
        await updateFirmByCustomer(invoice.customer as string, {
          subscription_status: 'active',
        })
      }
      break
    }

    default:
      console.log('[stripe/webhook] unhandled event type:', event.type)
  }

  return NextResponse.json({ received: true })
}
