import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const stripe = new Stripe(secretKey)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const db = adminClient()

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    await db.from('orders')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('payment_intent_id', pi.id)

  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    await db.from('orders')
      .update({ payment_status: 'failed' })
      .eq('payment_intent_id', pi.id)

  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
    if (piId) {
      await db.from('orders')
        .update({ payment_status: 'refunded' })
        .eq('payment_intent_id', piId)
    }
  }

  return NextResponse.json({ received: true })
}
