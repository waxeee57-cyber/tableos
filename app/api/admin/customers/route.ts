import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(6).max(30),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_vip: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const q = url.searchParams.get('q') ?? ''
  const filter = url.searchParams.get('filter') ?? 'all'
  const sort = url.searchParams.get('sort') ?? 'recent'
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')))
  const offset = (page - 1) * limit

  let query = adminClient()
    .from('customers')
    .select('*', { count: 'exact' })

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,address.ilike.%${q}%`
    )
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  if (filter === 'vip') {
    query = query.eq('is_vip', true)
  } else if (filter === 'active') {
    query = query.gte('last_order_at', thirtyDaysAgo.toISOString())
  } else if (filter === 'dormant') {
    query = query.or(
      `last_order_at.lt.${ninetyDaysAgo.toISOString()},last_order_at.is.null`
    )
  }

  const sortMap: Record<string, { col: string; asc: boolean; nullsLast?: boolean }> = {
    recent: { col: 'last_order_at', asc: false, nullsLast: true },
    orders: { col: 'order_count', asc: false },
    spend: { col: 'total_spent', asc: false },
    alphabetical: { col: 'name', asc: true },
  }
  const sortConfig = sortMap[sort] ?? sortMap.recent
  query = query.order(sortConfig.col, {
    ascending: sortConfig.asc,
    nullsFirst: sortConfig.nullsLast === true ? false : undefined,
  })

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    customers: data,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const parsed = CreateCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Érvénytelen adatok.', details: parsed.error.issues }, { status: 400 })
  }

  const { data, error } = await adminClient()
    .from('customers')
    .insert({
      ...parsed.data,
      source: 'manual',
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Egy vendég már létezik ezzel a telefonszámmal.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data }, { status: 201 })
}
