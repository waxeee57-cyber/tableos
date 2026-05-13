import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { getBusinessConfig } from '@/lib/config'
import { sendEmail } from '@/lib/email/send'
import { reservationStatusEmail } from '@/lib/email/templates'
import type { Reservation } from '@/types'

const StatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'seated']),
})

const TERMINAL_STATUSES = new Set(['seated', 'cancelled'])

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const parsed = StatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Érvénytelen adatok.', details: parsed.error.issues }, { status: 400 })
  }

  const { status: newStatus } = parsed.data

  const { data: existing, error: fetchErr } = await adminClient()
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Foglalás nem található.' }, { status: 404 })
  }

  const current = existing as Reservation

  if (TERMINAL_STATUSES.has(current.status)) {
    if (current.status === 'seated') {
      return NextResponse.json({ error: 'Cannot change status of a seated reservation' }, { status: 400 })
    }
    if (current.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot change status of a cancelled reservation' }, { status: 400 })
    }
  }

  const { data: updated, error: updateErr } = await adminClient()
    .from('reservations')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (updateErr || !updated) {
    return NextResponse.json({ error: 'Nem sikerült frissíteni.' }, { status: 500 })
  }

  const reservation = updated as Reservation

  // Send email to customer if applicable
  if (reservation.customer_email && newStatus !== 'seated') {
    const config = await getBusinessConfig()
    if (config) {
      sendEmail({
        to: reservation.customer_email,
        ...reservationStatusEmail(reservation, config),
      }).catch(console.error)
    }
  }

  return NextResponse.json({ reservation })
}
