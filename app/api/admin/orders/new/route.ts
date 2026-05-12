import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { getBusinessConfig, generateOrderNumber } from '@/lib/config'
import { sendEmail } from '@/lib/email/send'
import { orderConfirmationEmail } from '@/lib/email/templates'
import { normalizePhone } from '@/lib/phone'
import type { Order, OrderItem } from '@/types'

const ItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  item_name: z.string(),
  item_size: z.string().nullable().optional(),
  quantity: z.number().int().min(1).max(99),
  unit_price: z.number().int().min(0),
  notes: z.string().max(500).nullable().optional(),
})

const OrderSchema = z.object({
  customer_id: z.string().uuid().nullable(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(6),
  customer_email: z.string().email().nullable().optional(),
  order_type: z.enum(['delivery', 'takeaway']),
  delivery_address: z.string().nullable().optional(),
  delivery_city: z.string().nullable().optional(),
  delivery_postal_code: z.string().nullable().optional(),
  delivery_notes: z.string().max(500).nullable().optional(),
  delivery_fee: z.number().int().min(0),
  items: z.array(ItemSchema).min(1),
  payment_method: z.enum(['cash', 'card', 'szep_card']),
  customer_notes: z.string().max(1000).nullable().optional(),
  estimated_delivery_minutes: z.number().int().min(0).max(180),
})

function isSchemaCacheError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return err.code === 'PGRST204' || (err.message?.includes('schema cache') ?? false)
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés' }, { status: 400 })
  }

  const parsed = OrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Érvénytelen adatok', details: parsed.error.issues }, { status: 400 })
  }

  const input = parsed.data
  const config = await getBusinessConfig()
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 500 })

  let customerId = input.customer_id
  let autoLinkedCustomer: string | undefined

  // Step 1: if no customer selected, try to auto-link by normalized phone
  if (!customerId && input.customer_phone) {
    const normalized = normalizePhone(input.customer_phone)
    if (normalized) {
      const { data: found } = await adminClient()
        .from('customers')
        .select('id, name')
        .eq('phone', normalized)
        .maybeSingle()
      if (found) {
        customerId = found.id as string
        autoLinkedCustomer = found.name as string
      }
    }
  }

  // Step 2: still no match — create new customer
  if (!customerId) {
    const normalizedPhone = normalizePhone(input.customer_phone) ?? input.customer_phone
    const baseCustomerPayload = {
      name: input.customer_name,
      phone: normalizedPhone,
      email: input.customer_email ?? null,
      address: input.delivery_address ?? null,
      city: input.delivery_city ?? null,
      postal_code: input.delivery_postal_code ?? null,
    }

    const { data: newCustomer, error: custErr } = await adminClient()
      .from('customers')
      .insert({ ...baseCustomerPayload, source: 'phone' })
      .select('id')
      .single()

    if (custErr) {
      if (custErr.code === '23505') {
        // Race condition: duplicate phone — find and use existing
        const { data: existing } = await adminClient()
          .from('customers')
          .select('id, name')
          .eq('phone', normalizedPhone)
          .maybeSingle()
        if (existing) {
          customerId = existing.id as string
          autoLinkedCustomer = existing.name as string
        }
      } else if (isSchemaCacheError(custErr)) {
        // Migration 04 not applied — retry without source column
        const { data: retryCustomer, error: retryErr } = await adminClient()
          .from('customers')
          .insert(baseCustomerPayload)
          .select('id')
          .single()
        if (!retryErr && retryCustomer) {
          customerId = retryCustomer.id as string
        } else if (retryErr?.code === '23505') {
          const { data: existing } = await adminClient()
            .from('customers')
            .select('id, name')
            .eq('phone', normalizedPhone)
            .maybeSingle()
          if (existing) {
            customerId = existing.id as string
            autoLinkedCustomer = existing.name as string
          }
        } else if (retryErr) {
          console.error('[Phone order] Customer create error (retry):', retryErr)
        }
      } else {
        console.error('[Phone order] Customer create error:', custErr)
      }
    } else if (newCustomer) {
      customerId = newCustomer.id as string
    }
  }

  // Calculate totals
  const subtotal = input.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const total = subtotal + input.delivery_fee

  const now = new Date().toISOString()
  const estimatedDeliveryAt = new Date(
    Date.now() + input.estimated_delivery_minutes * 60 * 1000
  ).toISOString()

  const orderNumber = generateOrderNumber(config.business_name)

  const baseOrderPayload = {
    order_number: orderNumber,
    customer_id: customerId ?? null,
    order_type: input.order_type,
    status: 'accepted',
    status_history: [{ status: 'accepted', timestamp: now }],
    delivery_address: input.delivery_address ?? null,
    delivery_city: input.delivery_city ?? null,
    delivery_postal_code: input.delivery_postal_code ?? null,
    delivery_notes: input.delivery_notes ?? null,
    delivery_fee: input.delivery_fee,
    estimated_delivery_at: estimatedDeliveryAt,
    subtotal,
    total,
    payment_method: input.payment_method,
    payment_status: 'pending',
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email ?? null,
    customer_notes: input.customer_notes ?? null,
    placed_at: now,
    accepted_at: now,
  }

  // Try order insert with source; fall back if migration 05 not applied
  let orderResult = await adminClient()
    .from('orders')
    .insert({ ...baseOrderPayload, source: 'phone' })
    .select('*')
    .single()

  if (isSchemaCacheError(orderResult.error)) {
    orderResult = await adminClient()
      .from('orders')
      .insert(baseOrderPayload)
      .select('*')
      .single()
  }

  const { data: order, error: orderErr } = orderResult

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message ?? 'Failed to create order' }, { status: 500 })
  }

  // Insert order items
  const itemRows = input.items.map((item) => ({
    order_id: order.id as string,
    menu_item_id: item.menu_item_id,
    item_name: item.item_name,
    item_size: item.item_size ?? null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
    notes: item.notes ?? null,
  }))

  const { data: insertedItems, error: itemsErr } = await adminClient()
    .from('order_items')
    .insert(itemRows)
    .select('*')

  if (itemsErr) {
    console.error('[Phone order] Items insert error:', itemsErr)
  }

  // Update customer aggregates atomically (fire-and-forget)
  if (customerId) {
    const cid = customerId
    void adminClient()
      .rpc('increment_customer_stats', { p_customer_id: cid, p_order_total: total })
      .then(undefined, console.error)
    void adminClient()
      .from('customers')
      .update({ last_order_at: now, preferred_payment_method: input.payment_method, updated_at: now })
      .eq('id', cid)
      .then(undefined, console.error)
  }

  // Send confirmation email if customer provided email
  if (input.customer_email && insertedItems) {
    sendEmail({
      to: input.customer_email,
      ...orderConfirmationEmail(
        order as unknown as Order,
        insertedItems as unknown as OrderItem[],
        config
      ),
    }).catch(console.error)
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
    ...(autoLinkedCustomer ? { autoLinkedCustomer } : {}),
  })
}
