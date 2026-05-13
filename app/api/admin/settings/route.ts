import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { invalidateConfigCache } from '@/lib/config'

export async function GET() {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await adminClient().from('business_config').select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))

  const allowed = [
    'business_name', 'tagline', 'logo_url', 'primary_color', 'phone', 'email',
    'address', 'city', 'currency', 'currency_symbol', 'locale',
    'delivery_enabled', 'takeaway_enabled', 'dine_in_enabled',
    'delivery_fee', 'delivery_fee_threshold', 'min_order_amount',
    'estimated_delivery_minutes', 'operating_hours', 'meta_description',
    // Phase 2 — payments
    'online_payment_enabled', 'cash_on_delivery_enabled', 'cash_on_pickup_enabled',
    // Phase 2 — scheduling/reservations
    'scheduling_enabled', 'scheduling_days_ahead', 'scheduling_slot_minutes',
    'reservations_enabled', 'reservations_days_ahead', 'reservations_slot_minutes', 'max_party_size',
  ]

  // Onboarding fields — admin only
  const adminOnly = ['onboarding_completed', 'onboarding_step']

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }
  if (auth.adminUser.role === 'admin') {
    for (const key of adminOnly) {
      if (key in body) update[key] = body[key]
    }
  }

  const { data, error } = await adminClient().from('business_config').update(update).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  invalidateConfigCache()
  return NextResponse.json({ config: data })
}
