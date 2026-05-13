import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Reservation } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReservationConfirmationPage({ params }: Props) {
  const { id } = await params

  const { data } = await adminClient()
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const reservation = data as Reservation
  const time = reservation.reservation_time.substring(0, 5)

  const statusLabels: Record<string, string> = {
    pending: 'Visszaigazolásra vár',
    confirmed: 'Visszaigazolva',
    cancelled: 'Lemondva',
    seated: 'Beültetve',
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    seated: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📅</div>
          <h1 className="text-2xl font-bold text-gray-900">Foglalás elküldve!</h1>
          <p className="text-gray-500 mt-2">Hamarosan visszaigazoljuk a foglalását.</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Név</span>
            <span className="font-medium text-gray-900">{reservation.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Dátum</span>
            <span className="font-medium text-gray-900">{reservation.reservation_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Időpont</span>
            <span className="font-medium text-gray-900">{time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vendégek</span>
            <span className="font-medium text-gray-900">{reservation.party_size} fő</span>
          </div>
          {reservation.notes && (
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 flex-shrink-0">Megjegyzés</span>
              <span className="font-medium text-gray-900 text-right">{reservation.notes}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Állapot</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[reservation.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {statusLabels[reservation.status] ?? reservation.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
