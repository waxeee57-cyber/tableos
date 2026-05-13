import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { adminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { getBusinessConfig, generateOrderNumber, isOpen } from '@/lib/config'
import { sendEmail } from '@/lib/email/send'
import { orderConfirmationEmail, newOrderAdminEmail } from '@/lib/email/templates'
import type { Order, OrderItem } from '@/types'

const PlaceOrderSchema = z.object({
  orderType: z.enum(['delivery', 'takeaway', 'dine_in']),
  paymentMethod: z.enum(['cash', 'card', 'card_online', 'szep_card']).default('cash'),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email().optional().nullable(),
  }),
  delivery: z
    .object({
      address: z.string().min(1),
      city: z.string().min(1),
      postalCode: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      name: z.string().min(1),
      size: z.string().optional().nullable(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().int().min(0),
    })
  ).min(1),
  // Feature 1 — scheduled orders
  is_scheduled: z.boolean().default(false),
  scheduled_for: z.string().datetime().optional().nullable(),
  // Feature 3 — reservation linkage
  reservation_id: z.string().uuid().optional().nullable(),
  // Phase 2 — Stripe payment
  payment_intent_id: z.string().optional().nullable(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'cash']).default('cash'),
})

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  if (!(await rateLimit(`order:${ip}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Túl sok rendelés. Próbáld később.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const parsed = PlaceOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Érvénytelen adatok.', details: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data
  const config = await getBusinessConfig()

  if (!config) {
    return NextResponse.json({ error: 'Szerver hiba.' }, { status: 500 })
  }

  // Scheduling validation
  if (data.is_scheduled) {
    if (!data.scheduled_for) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 })
    }
    if (new Date(data.scheduled_for) <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
    }
  }

  const scheduledFor = data.is_scheduled ? (data.scheduled_for ?? null) : null

  // Reservation validation
  let reservationId: string | null = data.reservation_id ?? null
  if (reservationId) {
    const { data: reservation, error: resErr } = await adminClient()
      .from('reservations')
      .select('id, status, reservation_date, reservation_time')
      .eq('id', reservationId)
      .single()

    if (resErr || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 400 })
    }
    if (reservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot order for a cancelled reservation' }, { status: 400 })
    }
  }

  // Stripe payment verification
  let paymentIntentId: string | null = data.payment_intent_id ?? null
  let paymentStatus: string = data.payment_status

  if (paymentStatus === 'paid' && paymentIntentId) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 })
    }
    const stripe = new Stripe(secretKey)
    let pi: Stripe.PaymentIntent
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch {
      return NextResponse.json({ error: 'Payment not found' }, { status: 400 })
    }
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }
    // Prevent reuse
    const { data: existing } = await adminClient()
      .from('orders')
      .select('id')
      .eq('payment_intent_id', paymentIntentId)
      .limit(1)
      .single()
    if (existing) {
      return NextResponse.json({ error: 'Payment already used' }, { status: 400 })
    }
  } else if (paymentStatus !== 'paid') {
    paymentIntentId = null
  }

  // Only enforce isOpen check for non-scheduled, non-reservation ASAP orders
  if (!data.is_scheduled && !reservationId && !isOpen(config)) {
    return NextResponse.json({ error: 'Az étterem jelenleg zárva van.' }, { status: 400 })
  }

  const subtotal = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  if (data.orderType === 'delivery' && config.min_order_amount > 0 && subtotal < config.min_order_amount) {
    return NextResponse.json({
      error: `Minimum rendelési összeg kiszállításhoz: ${config.min_order_amount} ${config.currency_symbol}`,
    }, { status: 400 })
  }

  let deliveryFee = 0
  if (data.orderType === 'delivery') {
    if (config.delivery_fee_threshold > 0 && subtotal >= config.delivery_fee_threshold) {
      deliveryFee = 0
    } else if (data.delivery?.city) {
      const { data: zones } = await adminClient().from('delivery_zones').select('*').eq('is_active', true).order('sort_order')
      const zone = zones?.find((z) => z.areas.toLowerCase().includes(data.delivery!.city!.toLowerCase()))
      deliveryFee = zone ? zone.delivery_fee : config.delivery_fee
    } else {
      deliveryFee = config.delivery_fee
    }
  }

  const total = subtotal + deliveryFee

  let customerId: string | null = null
  const { data: existingCustomer } = await adminClient().from('customers').select('id, order_count, total_spent').eq('phone', data.customer.phone).single()

  const now = new Date().toISOString()

  if (existingCustomer) {
    customerId = existingCustomer.id
    await adminClient().from('customers').update({
      order_count: (existingCustomer.order_count ?? 0) + 1,
      total_spent: (existingCustomer.total_spent ?? 0) + total,
      last_order_at: now,
      preferred_payment_method: data.paymentMethod,
      updated_at: now,
    }).eq('id', customerId)
  } else {
    const { data: newCustomer } = await adminClient().from('customers').insert({
      name: data.customer.name,
      phone: data.customer.phone,
      email: data.customer.email ?? null,
      address: data.delivery?.address ?? null,
      city: data.delivery?.city ?? null,
      postal_code: data.delivery?.postalCode ?? null,
      order_count: 1,
      total_spent: total,
      last_order_at: now,
      preferred_payment_method: data.paymentMethod,
      source: 'online',
    }).select('id').single()
    customerId = newCustomer?.id ?? null
  }

  // Retry up to 3 times on order_number collision (23505 unique violation)
  let order: Record<string, unknown> | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = generateOrderNumber(config.business_name)
    const { data: o, error: oErr } = await adminClient().from('orders').insert({
      order_number: orderNumber,
      customer_id: customerId,
      order_type: data.orderType,
      status: 'new',
      status_history: [{ status: 'new', timestamp: new Date().toISOString() }],
      delivery_address: data.delivery?.address ?? null,
      delivery_city: data.delivery?.city ?? null,
      delivery_postal_code: data.delivery?.postalCode ?? null,
      delivery_notes: data.delivery?.notes ?? null,
      delivery_fee: deliveryFee,
      subtotal,
      total,
      payment_method: data.paymentMethod,
      payment_status: paymentStatus,
      payment_intent_id: paymentIntentId,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
      customer_name: data.customer.name,
      customer_phone: data.customer.phone,
      customer_email: data.customer.email ?? null,
      customer_notes: data.notes ?? null,
      is_scheduled: data.is_scheduled,
      scheduled_for: scheduledFor,
      reservation_id: reservationId,
      source: 'online',
    }).select('*').single()

    if (!oErr) { order = o as Record<string, unknown>; break }
    // Retry only on order_number unique violation
    if (oErr.code !== '23505' || !oErr.message?.includes('order_number')) {
      return NextResponse.json({ error: 'Nem sikerült a rendelést menteni.' }, { status: 500 })
    }
  }

  if (!order) {
    return NextResponse.json({ error: 'Nem sikerült a rendelést menteni.' }, { status: 500 })
  }

  const orderItems = data.items.map((i) => ({
    order_id: order!.id,
    menu_item_id: i.menuItemId,
    item_name: i.name,
    item_size: i.size ?? null,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    total_price: i.unitPrice * i.quantity,
  }))

  const { error: itemsErr } = await adminClient().from('order_items').insert(orderItems)
  if (itemsErr) {
    // Roll back the order so no empty order persists
    await adminClient().from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Nem sikerült a rendelést menteni.' }, { status: 500 })
  }

  const { data: createdItems } = await adminClient().from('order_items').select('*').eq('order_id', order.id)

  const emailItems = (createdItems ?? []) as OrderItem[]
  const fullOrder = order as unknown as Order

  Promise.all([
    data.customer.email
      ? sendEmail({ to: data.customer.email, ...orderConfirmationEmail(fullOrder, emailItems, config) })
      : Promise.resolve(),
    config.email
      ? sendEmail({ to: config.email, ...newOrderAdminEmail(fullOrder, emailItems, config) })
      : Promise.resolve(),
    process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL !== config.email
      ? sendEmail({ to: process.env.ADMIN_EMAIL, ...newOrderAdminEmail(fullOrder, emailItems, config) })
      : Promise.resolve(),
  ]).catch(console.error)

  return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.order_number })
}
