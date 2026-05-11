import { adminClient } from '@/lib/supabase/admin'
import { getBusinessConfig } from '@/lib/config'
import { formatPrice } from '@/lib/format'
import type { Order } from '@/types'
import AdminDashboardClient from '@/components/admin/AdminDashboardClient'

export const revalidate = 30

async function getDashboardData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [ordersRes, configRes] = await Promise.all([
    adminClient().from('orders').select('*, order_items(*)').gte('placed_at', today.toISOString()).order('placed_at', { ascending: false }),
    getBusinessConfig(),
  ])

  const orders = (ordersRes.data ?? []) as Order[]
  const completed = orders.filter((o) => !['cancelled', 'rejected'].includes(o.status))
  const revenue = completed.reduce((s, o) => s + o.total, 0)
  const avg = completed.length > 0 ? Math.round(revenue / completed.length) : 0

  // Top item
  const itemCounts = new Map<string, number>()
  for (const order of completed) {
    for (const item of order.order_items ?? []) {
      const key = item.item_name
      itemCounts.set(key, (itemCounts.get(key) ?? 0) + item.quantity)
    }
  }
  let topItem = ''
  let topCount = 0
  for (const [name, count] of itemCounts) {
    if (count > topCount) { topItem = name; topCount = count }
  }

  return { orders, revenue, avg, topItem, config: configRes }
}

export default async function DashboardPage() {
  const { orders, revenue, avg, topItem, config } = await getDashboardData()
  const currency = config?.currency ?? 'HUF'
  const symbol = config?.currency_symbol ?? 'Ft'

  const activeOrders = orders.filter((o) =>
    ['new', 'accepted', 'preparing', 'ready', 'delivering'].includes(o.status)
  )

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <AdminDashboardClient />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Rendelések ma', value: orders.length.toString() },
          { label: 'Bevétel ma', value: formatPrice(revenue, currency, symbol) },
          { label: 'Átlagos rendelés', value: formatPrice(avg, currency, symbol) },
          { label: 'Legkelendőbb', value: topItem || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Active orders */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Aktív rendelések ({activeOrders.length})
        </h2>
        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            Nincsenek aktív rendelések
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-gray-900">#{order.order_number}</span>
                    <span className="ml-2 text-sm text-gray-500">{order.customer_name}</span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-gray-500 mt-1">{formatPrice(order.total, currency, symbol)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    accepted: 'bg-yellow-100 text-yellow-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-green-100 text-green-700',
    delivering: 'bg-purple-100 text-purple-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  }
  const labels: Record<string, string> = {
    new: 'Új', accepted: 'Elfogadva', preparing: 'Készül',
    ready: 'Kész', delivering: 'Kiszállítás', completed: 'Kész',
    cancelled: 'Lemondva',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}
