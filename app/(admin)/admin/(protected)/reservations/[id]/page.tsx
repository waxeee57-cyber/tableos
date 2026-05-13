import { requireAdmin } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Reservation, Order } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export const revalidate = 0

export default async function ReservationDetailPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const [reservationRes, ordersRes] = await Promise.all([
    adminClient().from('reservations').select('*').eq('id', id).single(),
    adminClient()
      .from('orders')
      .select('*, order_items(*)')
      .eq('reservation_id', id)
      .order('placed_at', { ascending: true }),
  ])

  if (!reservationRes.data) notFound()

  const reservation = reservationRes.data as Reservation
  const orders = (ordersRes.data ?? []) as Order[]
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

  const orderStatusLabels: Record<string, string> = {
    new: 'Új', accepted: 'Elfogadva', preparing: 'Készül',
    ready: 'Kész', delivering: 'Kiszállítás', completed: 'Teljesítve',
    cancelled: 'Lemondva', rejected: 'Elutasítva',
  }

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin/reservations" className="text-gray-500 hover:text-gray-900 text-sm">← Foglalások</Link>
        <h1 className="text-2xl font-bold text-gray-900">Foglalás részletei</h1>
      </div>

      {/* Reservation details */}
      <div className="bg-white rounded-xl border p-5 mb-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{reservation.customer_name}</h2>
            <a href={`tel:${reservation.customer_phone}`} className="text-blue-600 hover:underline text-sm">
              {reservation.customer_phone}
            </a>
            {reservation.customer_email && (
              <span className="text-sm text-gray-500"> · {reservation.customer_email}</span>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[reservation.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {statusLabels[reservation.status] ?? reservation.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Dátum</p>
            <p className="font-medium text-gray-900">{reservation.reservation_date}</p>
          </div>
          <div>
            <p className="text-gray-500">Időpont</p>
            <p className="font-medium text-gray-900">{time}</p>
          </div>
          <div>
            <p className="text-gray-500">Vendégek száma</p>
            <p className="font-medium text-gray-900">{reservation.party_size} fő</p>
          </div>
          <div>
            <p className="text-gray-500">Létrehozva</p>
            <p className="font-medium text-gray-900">{new Date(reservation.created_at).toLocaleDateString('hu-HU')}</p>
          </div>
        </div>

        {reservation.notes && (
          <div className="text-sm">
            <p className="text-gray-500 mb-1">Megjegyzés</p>
            <p className="text-gray-900">{reservation.notes}</p>
          </div>
        )}

        {reservation.internal_notes && (
          <div className="text-sm bg-amber-50 rounded-lg px-3 py-2">
            <p className="text-amber-700 font-medium">Belső megjegyzés</p>
            <p className="text-amber-900">{reservation.internal_notes}</p>
          </div>
        )}
      </div>

      {/* Linked orders */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Előrendelések ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            Nincs előrendelés ehhez a foglaláshoz
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const orderItems = order.order_items ?? []
              const itemsSummary = orderItems
                .slice(0, 3)
                .map((i) => `${i.quantity}× ${i.item_name}`)
                .join(', ')
              const moreCount = orderItems.length - 3

              return (
                <div key={order.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/admin/orders`}
                        className="font-bold text-orange-600 hover:underline"
                      >
                        #{order.order_number}
                      </Link>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                        {orderStatusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm">
                      {order.total.toLocaleString()} Ft
                    </span>
                  </div>

                  {orderItems.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {itemsSummary}{moreCount > 0 ? ` +${moreCount} más` : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
