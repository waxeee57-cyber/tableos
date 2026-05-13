import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? url.searchParams.get('phone') ?? '').trim()

  if (q.length < 1) {
    return NextResponse.json({ customers: [] })
  }

  // Strip PostgREST filter metacharacters before injecting into .or() string
  const safe = q.replace(/[,()]/g, '')
  const digitsOnly = safe.replace(/\D/g, '')

  // Always search name + email; add phone filter when digits present
  const filters: string[] = [
    `name.ilike.%${safe}%`,
    `email.ilike.%${safe}%`,
  ]

  if (digitsOnly.length >= 1) {
    filters.push(`phone.ilike.%${digitsOnly}%`)
    if (safe !== digitsOnly) {
      // also match raw input in case user typed "+36 30 1" with spaces
      filters.push(`phone.ilike.%${safe}%`)
    }
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
    const { data: minimal, error: fallbackErr } = await adminClient()
      .from('customers')
      .select('id, name, phone, email, address, city, order_count, total_spent, notes')
      .or(filters.join(','))
      .order('created_at', { ascending: false })
      .limit(8)
    if (fallbackErr) {
      console.error('[CustomerSearch] fallback error:', fallbackErr)
      return NextResponse.json({ error: fallbackErr.message }, { status: 500 })
    }
    return NextResponse.json({ customers: minimal ?? [] })
  }

  if (error) {
    console.error('[CustomerSearch] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customers: data ?? [] })
}
