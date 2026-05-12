'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Order, BusinessConfig, OrderStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { printOrder } from '@/lib/print'

interface Props {
  initialOrders: Order[]
  config: BusinessConfig
}

function minutesSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000)
}

function timerColor(minutes: number): string {
  if (minutes < 15) return 'text-green-600'
  if (minutes < 30) return 'text-yellow-600'
  return 'text-red-600'
}

const COLUMN_CONFIG: { status: string; label: string; nextStatus: OrderStatus; nextLabel: string; urgent: boolean }[] = [
  { status: 'new',      label: 'ÚJ RENDELÉS', nextStatus: 'accepted',  nextLabel: 'ELFOGAD ✓',  urgent: true  },
  { status: 'accepted', label: 'ELFOGADVA',    nextStatus: 'preparing', nextLabel: 'KÉSZÍTÉS →', urgent: false },
  { status: 'preparing',label: 'KÉSZÜL',       nextStatus: 'ready',     nextLabel: 'KÉSZ ✓',     urgent: false },
  { status: 'ready',    label: 'KÉSZ',         nextStatus: 'completed', nextLabel: 'KIADVA ✓',   urgent: false },
]

export default function KitchenDisplayClient({ initialOrders, config }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [updating, setUpdating] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [alarmActive, setAlarmActive] = useState(false)

  const newOrdersCount = orders.filter(o => o.status === 'new').length

  // Timer tick — refreshes elapsed-time display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  // Push notification permission request on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders?status=all&limit=50')
    if (res.ok) {
      const data = await res.json()
      setOrders(
        (data.orders ?? []).filter((o: Order) =>
          ['new', 'accepted', 'preparing', 'ready'].includes(o.status)
        )
      )
    }
  }, [])

  // Activate alarm whenever there are new orders; deactivate when none
  useEffect(() => {
    if (newOrdersCount > 0) {
      setAlarmActive(true)
    } else {
      setAlarmActive(false)
    }
  }, [newOrdersCount])

  // Two-tone repeating alarm every 4 s while active
  useEffect(() => {
    if (!alarmActive) return

    function playAlarm() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        ;[880, 660, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = freq
          gain.gain.value = 0.3
          osc.start(ctx.currentTime + i * 0.2)
          osc.stop(ctx.currentTime + i * 0.2 + 0.15)
        })
      } catch {}
    }

    playAlarm()
    const interval = setInterval(playAlarm, 4000)
    return () => clearInterval(interval)
  }, [alarmActive])

  // Realtime: INSERT fires notification; UPDATE just refreshes list.
  // Falls back to 30s polling if Realtime is unavailable.
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null
    const supabase = createClient()
    const channel = supabase
      .channel('kitchen-orders')
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

  async function advance(orderId: string, nextStatus: OrderStatus) {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) await fetchOrders()
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4" key={tick}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-white">Konyhai kijelző — {config.business_name}</h1>
        <div className="flex items-center gap-2">
          {alarmActive && (
            <button
              onClick={() => setAlarmActive(false)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold animate-pulse"
            >
              🔔 Némítás ({newOrdersCount})
            </button>
          )}
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded"
          >
            Teljes képernyő
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-4 gap-4 h-full">
          {COLUMN_CONFIG.map(({ status, label, nextStatus, nextLabel, urgent }) => {
            const colOrders = orders.filter((o) => o.status === status)
            return (
              <div
                key={status}
                className={`min-w-[280px] rounded-xl p-3 ${urgent ? 'bg-orange-50' : 'bg-gray-800'}`}
              >
                <h2 className={`text-sm font-bold uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2 ${urgent ? 'text-orange-600' : 'text-gray-400'}`}>
                  {urgent && colOrders.length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  )}
                  {label} ({colOrders.length})
                </h2>

                <div className="space-y-3">
                  {colOrders.map((order) => {
                    const minutes = minutesSince(order.placed_at)
                    return (
                      <div
                        key={order.id}
                        className={urgent
                          ? 'bg-white rounded-lg p-3 border-l-4 border-orange-500'
                          : 'bg-gray-700 rounded-lg p-3'}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold text-lg ${urgent ? 'text-gray-900' : 'text-white'}`}>
                            #{order.order_number}
                          </span>
                          <span className={`text-sm font-bold ${timerColor(minutes)}`}>{minutes} perc</span>
                        </div>

                        <div className="space-y-1 mb-3">
                          {(order.order_items ?? []).map((item) => (
                            <p key={item.id} className={`text-sm ${urgent ? 'text-gray-700' : 'text-gray-200'}`}>
                              <span className="font-bold">{item.quantity}×</span> {item.item_name}
                              {item.item_size
                                ? <span className={urgent ? 'text-gray-500' : 'text-gray-400'}> {item.item_size}</span>
                                : null}
                            </p>
                          ))}
                        </div>

                        {order.customer_notes && (
                          <p className={`text-xs mb-2 ${urgent ? 'text-amber-700' : 'text-yellow-300'}`}>
                            💬 {order.customer_notes}
                          </p>
                        )}

                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => printOrder(order)}
                            className="text-xs px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-500"
                          >
                            🖨
                          </button>
                          <button
                            disabled={updating === order.id}
                            onClick={() => advance(order.id, nextStatus)}
                            className={`flex-1 rounded-lg font-bold transition-colors disabled:opacity-60 bg-orange-500 hover:bg-orange-400 text-white ${urgent ? 'py-3 text-base' : 'py-2 text-sm'}`}
                          >
                            {updating === order.id ? '...' : nextLabel}
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {colOrders.length === 0 && (
                    <p className={`text-center text-sm py-8 ${urgent ? 'text-orange-300' : 'text-gray-600'}`}>
                      Üres
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
