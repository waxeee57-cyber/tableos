import { adminClient } from '@/lib/supabase/admin'
import { getBusinessConfig, isOpen } from '@/lib/config'
import { notFound } from 'next/navigation'
import type { Reservation, BusinessConfig, MenuCategory, MenuItem } from '@/types'
import ReservationOrderClient from '@/components/public/ReservationOrderClient'

interface Props {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function ReservationOrderPage({ params }: Props) {
  const { id } = await params

  const [reservationRes, config, categoriesRes, itemsRes] = await Promise.all([
    adminClient().from('reservations').select('*').eq('id', id).single(),
    getBusinessConfig(),
    adminClient().from('menu_categories').select('*').eq('is_visible', true).order('sort_order'),
    adminClient().from('menu_items').select('*').eq('is_visible', true).eq('is_available', true).order('sort_order'),
  ])

  if (!reservationRes.data) notFound()

  const reservation = reservationRes.data as Reservation

  if (reservation.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Foglalás lemondva</h1>
          <p className="text-gray-500">Ez a foglalás le lett mondva, ezért előrendelés nem lehetséges.</p>
        </div>
      </div>
    )
  }

  const open = config ? isOpen(config) : false

  return (
    <ReservationOrderClient
      reservation={reservation}
      config={config as BusinessConfig}
      categories={(categoriesRes.data ?? []) as MenuCategory[]}
      items={(itemsRes.data ?? []) as MenuItem[]}
      isOpen={open}
    />
  )
}
