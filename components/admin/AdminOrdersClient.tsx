'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Order, BusinessConfig, OrderStatus } from '@/types'
import { formatPrice, timeAgo } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { printOrder } from '@/lib/print'

const SOURCE_BADGE: Record<string, { label: string; cls: string } | null> = {
  online: null,
  phone: { label: 'Telefon', cls: 'bg-yellow-100 text-yellow-700' },
  walk_in: { label: 'Helyben', cls: 'bg-gray-100 text-gray-600' },
  admin: { label: 'Admin', cls: 'bg-gray-100 text-gray-600' },
}

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'new', label: 'Új' },
  { key: 'accepted', label: 'Elfogadva' },
  { key: 'preparing', label: 'Készül' },
  { key: 'ready', label: 'Kész' },
  { key: 'all', label: 'Összes' },
]

const NEXT_STATUS: Record<string, { label: string; status: OrderStatus }[]> = {
  new: [
    { label: '✓ Elfogadás', status: 'accepted' },
    { label: '✕ Elutasítás', status: 'rejected' },
  ],
  accepted: [
    { label: '→ Készítés indítása', status: 'preparing' },
    { label: '✕ Lemondás', status: 'cancelled' },
  ],
  preparing: [
    { label: '✓ Elkészült', status: 'ready' },
    { label: '✕ Lemondás', status: 'cancelled' },
  ],
  ready: [
    { label: '🚴 Kiszállítás', status: 'delivering' },
    { label: '✓ Átvette', status: 'completed' },
    { label: '✕ Lemondás', status: 'cancelled' },
  ],
  delivering: [
    { label: '✓ Kézbesítve', status: 'completed' },
    { label: '✕ Lemondás', status: 'cancelled' },
  ],
}

interface Props {
  initialOrders: Order[]
  config: BusinessConfig
}

function formatScheduledFor(isoString: string, tz: string): string {
  const d = new Date(isoString)
  const datePart = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).format(d)
  const timePart = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return `${datePart}, ${timePart}`
}

export default function AdminOrdersClient({ initialOrders, config }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [activeTab, setActiveTab] = useState('new')
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()

  const currency = config.currency ?? 'HUF'
  const symbol = config.currency_symbol ?? 'Ft'
  const tz = config.timezone ?? 'Europe/Budapest'

  // "N" key → new order (when not focused in an input)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'n' || e.key === 'N') router.push('/admin/orders/new')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  // Push notification permission request on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders?limit=100')
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders ?? [])
    }
  }, [])

  // Realtime: INSERT fires notification; UPDATE just refreshes list.
  // Falls back to 30s polling if Realtime is unavailable.
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null
    const supabase = createClient()
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        fetchOrders()
        if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
          const newOrder = payload.new as Partial<Order>
          new Notification('🍕 Új rendelés!', {
            body: `#${newOrder.order_number ?? ''} — azonnali elfogadás szükséges`,
            icon: '/favicon.ico',
            tag: 'new-order',
            requireInteraction: true,
          })
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe((status) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !pollInterval) {
          pollInterval = setInterval(fetchOrders, 30_000)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [fetchOrders])

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) await fetchOrders()
    } finally {
      setUpdating(null)
    }
  }

  const tabFiltered = orders.filter((o) =>
    activeTab === 'all' ? true : o.status === activeTab
  )

  // Separate scheduled from ASAP, sort each group
  const scheduledOrders = tabFiltered
    .filter((o) => o.is_scheduled)
    .sort((a, b) => {
      const af = a.scheduled_for ?? ''
      const bf = b.scheduled_for ?? ''
      return af < bf ? -1 : af > bf ? 1 : 0
    })

  const asapOrders = tabFiltered
    .filter((o) => !o.is_scheduled)
    .sort((a, b) => (a.placed_at < b.placed_at ? 1 : a.placed_at > b.placed_at ? -1 : 0))

  const hasScheduled = scheduledOrders.length > 0
  const hasAsap = asapOrders.length > 0

  function countByStatus(status: string) {
    return orders.filter((o) => o.status === status).length
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Rendelések</h1>
        <Link
          href="/admin/orders/new"
          className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
          title="Új rendelés (N)"
        >
          <Plus className="w-4 h-4" />
          Új rendelés
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-2 mb-4">
        {STATUS_TABS.map(({ key, label }) => {
          const count = key === 'all' ? orders.length : countByStatus(key)
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-colors ${
                activeTab === key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label} {count > 0 && <span className="ml-1 opacity-75">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Orders */}
      {!hasScheduled && !hasAsap ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          Nincs rendelés ebben a kategóriában
        </div>
      ) : (
        <div className="space-y-4">
          {hasScheduled && (
            <div>
              {hasAsap && (
                <h2 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  📅 Előrendelt ({scheduledOrders.length})
                </h2>
              )}
              <div className="space-y-3">
                {scheduledOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currency={currency}
                    symbol={symbol}
                    tz={tz}
                    updating={updating === order.id}
                    onStatusChange={(status) => updateStatus(order.id, status)}
                  />
                ))}
              </div>
            </div>
          )}

          {hasAsap && (
            <div>
              {hasScheduled && (
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Azonnali rendelések ({asapOrders.length})
                </h2>
              )}
              <div className="space-y-3">
                {asapOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currency={currency}
                    symbol={symbol}
                    tz={tz}
                    updating={updating === order.id}
                    onStatusChange={(status) => updateStatus(order.id, status)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order,
  currency,
  symbol,
  tz,
  updating,
  onStatusChange,
}: {
  order: Order
  currency: string
  symbol: string
  tz: string
  updating: boolean
  onStatusChange: (status: OrderStatus) => void
}) {
  const nextStatuses = NEXT_STATUS[order.status] ?? []
  const typeLabel = order.order_type === 'delivery' ? '🚴 Kiszállítás' : order.order_type === 'takeaway' ? '🛍️ Elvitel' : '🍽️ Helyi'
  const payLabel: Record<string, string> = { cash: 'Készpénz', card: 'Kártya', szep_card: 'SZÉP', card_online: 'Online' }

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${order.is_scheduled ? 'border-purple-200 bg-purple-50/30' : ''}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-lg">#{order.order_number}</span>
          <span className="text-sm text-gray-500">{typeLabel}</span>
          <span className="text-xs text-gray-400">{timeAgo(order.placed_at)}</span>
          {order.is_scheduled && order.scheduled_for && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
              📅 {formatScheduledFor(order.scheduled_for, tz)}
            </span>
          )}
          {order.source && SOURCE_BADGE[order.source] && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[order.source]!.cls}`}>
              {SOURCE_BADGE[order.source]!.label}
            </span>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-2 text-sm text-gray-700">
        <span className="font-medium">{order.customer_name}</span>
        {' · '}
        <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">{order.customer_phone}</a>
      </div>

      {order.delivery_address && (
        <p className="text-sm text-gray-500 mt-0.5">
          📍 {order.delivery_address}, {order.delivery_city}
        </p>
      )}

      {order.customer_notes && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
          💬 {order.customer_notes}
        </p>
      )}

      <div className="mt-3 space-y-0.5">
        {(order.order_items ?? []).map((item) => (
          <div key={item.id} className="text-sm text-gray-600">
            {item.quantity}× {item.item_name}{item.item_size ? ` (${item.item_size})` : ''}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <span className="font-bold text-gray-900">
          {formatPrice(order.total, currency, symbol)}
          {' · '}
          <span className="font-normal text-gray-500">{payLabel[order.payment_method] ?? order.payment_method}</span>
        </span>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => printOrder(order)}
            className="text-sm px-3 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title="Nyomtatás"
          >
            🖨 Nyomtat
          </button>
          {nextStatuses.map(({ label, status }) => (
            <button
              key={status}
              disabled={updating}
              onClick={() => onStatusChange(status)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60 ${
                status === 'cancelled' || status === 'rejected'
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {updating ? '...' : label}
            </button>
          ))}
        </div>
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
    rejected: 'bg-red-100 text-red-600',
  }
  const labels: Record<string, string> = {
    new: 'Új', accepted: 'Elfogadva', preparing: 'Készül',
    ready: 'Kész', delivering: 'Kiszállítás', completed: 'Teljesítve',
    cancelled: 'Lemondva', rejected: 'Elutasítva',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}
