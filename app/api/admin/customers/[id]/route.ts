import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(6).max(30).optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_vip: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [customerRes, ordersRes] = await Promise.all([
    adminClient().from('customers').select('*').eq('id', id).single(),
    adminClient()
      .from('orders')
      .select('id, order_number, total, status, placed_at, order_items(item_name, item_size, quantity)')
      .eq('customer_id', id)
      .order('placed_at', { ascending: false })
      .limit(10),
  ])

  if (customerRes.error || !customerRes.data) {
    return NextResponse.json({ error: 'Vendég nem található.' }, { status: 404 })
  }

  return NextResponse.json({ customer: customerRes.data, orders: ordersRes.data ?? [] })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const parsed = UpdateCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Érvénytelen adatok.', details: parsed.error.issues }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { is_vip: _is_vip, ...baseUpdateData } = parsed.data

  const { data, error } = await adminClient()
    .from('customers')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Egy vendég már létezik ezzel a telefonszámmal.' },
        { status: 409 }
      )
    }
    // Migration 04 not yet applied — retry without is_vip
    if (error.code === 'PGRST204' || error.message?.includes('schema cache')) {
      const { data: retry, error: retryErr } = await adminClient()
        .from('customers')
        .update({ ...baseUpdateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (retryErr) {
        return NextResponse.json({ error: retryErr.message }, { status: 500 })
      }
      return NextResponse.json({ customer: retry })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Unlink orders first (preserve history)
  await adminClient().from('orders').update({ customer_id: null }).eq('customer_id', id)

  const { error } = await adminClient().from('customers').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
