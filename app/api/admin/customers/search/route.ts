import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  // ?q= is the new param; ?phone= is kept for backward compat
  const q = url.searchParams.get('q') ?? url.searchParams.get('phone') ?? ''

  if (q.length < 2) {
    return NextResponse.json({ customers: [] })
  }

  const safeQ = q.replace(/[,%()]/g, '')
  const digitsOnly = q.replace(/\D/g, '')

  // Build OR filter: always search by name; add phone and email conditionally
  const filters: string[] = [`name.ilike.%${safeQ}%`]

  if (safeQ.includes('@')) {
    filters.push(`email.ilike.%${safeQ}%`)
  }

  if (digitsOnly.length >= 2) {
    filters.push(`phone.ilike.%${digitsOnly}%`)
    // also match raw input in case user typed "+36 30 1" with spaces
    if (safeQ !== digitsOnly) filters.push(`phone.ilike.%${safeQ}%`)
  }

  const { data, error } = await adminClient()
    .from('customers')
    .select(
      'id, name, phone, email, address, city, order_count, total_spent, last_order_at, is_vip, preferred_payment_method, notes'
    )
    .or(filters.join(','))
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .limit(8)

  // Migration 04 not yet applied — retry with base columns only
  if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
    const { data: minimal } = await adminClient()
      .from('customers')
      .select('id, name, phone, email, address, city, order_count, total_spent, notes')
      .or(filters.join(','))
      .order('created_at', { ascending: false })
      .limit(8)
    return NextResponse.json({ customers: minimal ?? [] })
  }

  return NextResponse.json({ customers: data ?? [] })
}
