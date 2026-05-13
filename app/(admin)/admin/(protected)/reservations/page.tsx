import { requireAdmin } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import type { Reservation } from '@/types'
import AdminReservationsClient from '@/components/admin/AdminReservationsClient'

export const revalidate = 0

export default async function ReservationsPage() {
  await requireAdmin()

  const { data } = await adminClient()
    .from('reservations')
    .select('*')
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })

  return (
    <AdminReservationsClient
      initialReservations={(data ?? []) as Reservation[]}
    />
  )
}
