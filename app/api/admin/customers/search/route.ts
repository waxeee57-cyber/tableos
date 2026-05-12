import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const phoneQuery = url.searchParams.get('phone') ?? ''

  const digitsOnly = phoneQuery.replace(/\D/g, '')
  if (digitsOnly.length < 3) {
    return NextResponse.json({ customers: [] })
  }

  const { data } = await adminClient()
    .from('customers')
    .select(
      'id, name, phone, email, address, city, postal_code, order_count, total_spent, last_order_at, is_vip, preferred_payment_method, notes'
    )
    .or(`phone.ilike.%${digitsOnly}%`)
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .limit(5)

  return NextResponse.json({ customers: data ?? [] })
}
