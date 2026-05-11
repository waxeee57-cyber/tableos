import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
})

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  if (!rateLimit(`order:${ip}`, 10, 60 * 60 * 1000)) {
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

  if (!isOpen(config)) {
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

  if (existingCustomer) {
    customerId = existingCustomer.id
    await adminClient().from('customers').update({
      order_count: (existingCustomer.order_count ?? 0) + 1,
      total_spent: (existingCustomer.total_spent ?? 0) + total,
      updated_at: new Date().toISOString(),
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
    }).select('id').single()
    customerId = newCustomer?.id ?? null
  }

  const orderNumber = generateOrderNumber(config.business_name)

  const { data: order, error: orderErr } = await adminClient().from('orders').insert({
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
    payment_status: 'pending',
    customer_name: data.customer.name,
    customer_phone: data.customer.phone,
    customer_email: data.customer.email ?? null,
    customer_notes: data.notes ?? null,
  }).select('*').single()

  if (orderErr || !order) {
    console.error('Order insert error:', orderErr)
    return NextResponse.json({ error: 'Nem sikerült a rendelést menteni.' }, { status: 500 })
  }

  const orderItems = data.items.map((i) => ({
    order_id: order.id,
    menu_item_id: i.menuItemId,
    item_name: i.name,
    item_size: i.size ?? null,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    total_price: i.unitPrice * i.quantity,
  }))

  await adminClient().from('order_items').insert(orderItems)

  const { data: createdItems } = await adminClient().from('order_items').select('*').eq('order_id', order.id)

  const emailItems = (createdItems ?? []) as OrderItem[]
  const fullOrder = order as Order

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
