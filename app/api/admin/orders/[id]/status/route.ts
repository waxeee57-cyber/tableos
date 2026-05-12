import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { getBusinessConfig } from '@/lib/config'
import { sendEmail } from '@/lib/email/send'
import { orderStatusUpdateEmail } from '@/lib/email/templates'
import type { Order } from '@/types'

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['accepted', 'rejected'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivering', 'completed', 'cancelled'],
  delivering: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
}

const StatusSchema = z.object({
  status: z.enum(['new', 'accepted', 'preparing', 'ready', 'delivering', 'completed', 'cancelled', 'rejected']),
})

const TIMESTAMP_MAP: Record<string, string> = {
  accepted: 'accepted_at',
  preparing: 'preparing_at',
  ready: 'ready_at',
  delivering: 'delivering_at',
  completed: 'completed_at',
  cancelled: 'cancelled_at',
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = StatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { status: newStatus } = parsed.data
  const { data: order, error: fetchErr } = await adminClient().from('orders').select('*').eq('id', id).single()

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const allowed = VALID_TRANSITIONS[order.status as string] ?? []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot transition from ${order.status} to ${newStatus}` }, { status: 400 })
  }

  const now = new Date().toISOString()
  const history = [...(order.status_history ?? []), { status: newStatus, timestamp: now }]
  const tsField = TIMESTAMP_MAP[newStatus]

  const updateData: Record<string, unknown> = { status: newStatus, status_history: history, updated_at: now }
  if (tsField) updateData[tsField] = now

  const { data: updated, error: updateErr } = await adminClient().from('orders').update(updateData).eq('id', id).select('*').single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  if (updated?.customer_email) {
    getBusinessConfig().then((config) => {
      if (!config) return
      sendEmail({ to: updated.customer_email!, ...orderStatusUpdateEmail(updated as Order, config) }).catch(console.error)
    })
  }

  // Roll back customer aggregates atomically when an order is cancelled
  if (newStatus === 'cancelled' && updated?.customer_id) {
    void adminClient()
      .rpc('decrement_customer_stats', { p_customer_id: updated.customer_id, p_order_total: order.total })
      .then(undefined, console.error)
  }

  return NextResponse.json({ order: updated })
}
