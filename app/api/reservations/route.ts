import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { getBusinessConfig } from '@/lib/config'
import { sendEmail } from '@/lib/email/send'
import { reservationConfirmationEmail, newReservationAdminEmail } from '@/lib/email/templates'
import type { Reservation } from '@/types'

const ReservationSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(6).max(20),
  customer_email: z.string().email().optional().or(z.literal('')),
  party_size: z.number().int().min(1).max(50),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  if (!rateLimit(`reservation:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Túl sok kérés. Próbáld később.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const parsed = ReservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Érvénytelen adatok.', details: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data
  const config = await getBusinessConfig()

  if (!config) {
    return NextResponse.json({ error: 'Szerver hiba.' }, { status: 500 })
  }

  if (!config.reservations_enabled) {
    return NextResponse.json({ error: 'Online foglalás nem érhető el.' }, { status: 403 })
  }

  // Date must not be in the past
  const todayInTz = new Intl.DateTimeFormat('sv-SE', { timeZone: config.timezone }).format(new Date())
  if (data.reservation_date < todayInTz) {
    return NextResponse.json({ error: 'Date is in the past' }, { status: 400 })
  }

  // Party size check
  if (data.party_size > config.max_party_size) {
    return NextResponse.json({ error: 'Party size exceeds maximum' }, { status: 400 })
  }

  // Time must fall within operating hours for the given day
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const dateObj = new Date(data.reservation_date + 'T12:00:00')
  const dayKey = dayKeys[dateObj.getDay()]
  const hours = config.operating_hours[dayKey]

  if (!hours) {
    return NextResponse.json({ error: 'Time is outside opening hours' }, { status: 400 })
  }

  const [rh, rm] = data.reservation_time.split(':').map(Number)
  const [oh, om] = hours.open.split(':').map(Number)
  const [ch, cm] = hours.close.split(':').map(Number)
  const requestedMinutes = rh * 60 + rm
  const openMinutes = oh * 60 + om
  const closeMinutes = ch * 60 + cm

  if (requestedMinutes < openMinutes || requestedMinutes >= closeMinutes) {
    return NextResponse.json({ error: 'Time is outside opening hours' }, { status: 400 })
  }

  // Insert reservation
  const { data: reservation, error: insertErr } = await adminClient()
    .from('reservations')
    .insert({
      business_id: config.id,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email || null,
      party_size: data.party_size,
      reservation_date: data.reservation_date,
      reservation_time: data.reservation_time + ':00',
      notes: data.notes ?? null,
      status: 'pending',
    })
    .select('*')
    .single()

  if (insertErr || !reservation) {
    return NextResponse.json({ error: 'Nem sikerült a foglalást menteni.' }, { status: 500 })
  }

  const fullReservation = reservation as Reservation

  // Send emails (fire-and-forget)
  Promise.all([
    data.customer_email
      ? sendEmail({ to: data.customer_email, ...reservationConfirmationEmail(fullReservation, config) })
      : Promise.resolve(),
    config.email
      ? sendEmail({ to: config.email, ...newReservationAdminEmail(fullReservation, config) })
      : Promise.resolve(),
    process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL !== config.email
      ? sendEmail({ to: process.env.ADMIN_EMAIL, ...newReservationAdminEmail(fullReservation, config) })
      : Promise.resolve(),
  ]).catch(console.error)

  return NextResponse.json({ success: true, reservationId: reservation.id })
}
