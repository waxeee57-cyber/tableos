'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Order, BusinessConfig, OrderStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'

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

const COLUMN_CONFIG: { status: string; label: string; nextStatus: OrderStatus; nextLabel: string }[] = [
  { status: 'accepted', label: 'ELFOGADVA', nextStatus: 'preparing', nextLabel: 'KÉSZÍTÉS →' },
  { status: 'preparing', label: 'KÉSZÜL', nextStatus: 'ready', nextLabel: 'KÉSZ ✓' },
  { status: 'ready', label: 'KÉSZ', nextStatus: 'completed', nextLabel: 'KIADVA ✓' },
]

export default function KitchenDisplayClient({ initialOrders, config }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [updating, setUpdating] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders?status=all&limit=50')
    if (res.ok) {
      const data = await res.json()
      setOrders(
        (data.orders ?? []).filter((o: Order) =>
          ['accepted', 'preparing', 'ready'].includes(o.status)
        )
      )
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
        try {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          osc.connect(ctx.destination)
          osc.frequency.value = 660
          osc.start()
          osc.stop(ctx.currentTime + 0.2)
        } catch {}
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Konyhai kijelző — {config.business_name}</h1>
        <button
          onClick={() => document.documentElement.requestFullscreen?.()}
          className="text-gray-400 hover:text-white text-sm border border-gray-600 px-3 py-1 rounded"
        >
          Teljes képernyő
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 h-full">
        {COLUMN_CONFIG.map(({ status, label, nextStatus, nextLabel }) => {
          const colOrders = orders.filter((o) => o.status === status)
          return (
            <div key={status} className="bg-gray-800 rounded-xl p-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                {label} ({colOrders.length})
              </h2>
              <div className="space-y-3">
                {colOrders.map((order) => {
                  const minutes = minutesSince(order.placed_at)
                  return (
                    <div key={order.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-lg">#{order.order_number}</span>
                        <span className={`text-sm font-bold ${timerColor(minutes)}`}>{minutes} perc</span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {(order.order_items ?? []).map((item) => (
                          <p key={item.id} className="text-sm text-gray-200">
                            <span className="font-bold">{item.quantity}×</span> {item.item_name}
                            {item.item_size ? <span className="text-gray-400"> {item.item_size}</span> : null}
                          </p>
                        ))}
                      </div>
                      {order.customer_notes && (
                        <p className="text-xs text-yellow-300 mb-2">💬 {order.customer_notes}</p>
                      )}
                      <button
                        disabled={updating === order.id}
                        onClick={() => advance(order.id, nextStatus)}
                        className="w-full py-2 rounded-lg font-bold text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-60 transition-colors"
                      >
                        {updating === order.id ? '...' : nextLabel}
                      </button>
                    </div>
                  )
                })}
                {colOrders.length === 0 && (
                  <p className="text-gray-600 text-center text-sm py-8">Üres</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
