import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { getBusinessConfig } from '@/lib/config'

const IntentSchema = z.object({
  amount: z.number().int().min(1),
  currency: z.string().length(3),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = IntentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const config = await getBusinessConfig()
  if (!config?.online_payment_enabled) {
    return NextResponse.json({ error: 'Online payment not enabled' }, { status: 403 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 })
  }

  const stripe = new Stripe(secretKey)
  const intent = await stripe.paymentIntents.create({
    amount: parsed.data.amount,
    currency: parsed.data.currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
  })

  return NextResponse.json({ clientSecret: intent.client_secret })
}
