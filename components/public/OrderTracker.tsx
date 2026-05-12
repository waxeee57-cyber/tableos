'use client'

import { useEffect, useState } from 'react'
import type { Order, OrderItem, BusinessConfig } from '@/types'
import { formatPrice, formatDateTime } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const STATUS_STEPS = ['new', 'accepted', 'preparing', 'ready', 'delivering', 'completed'] as const
const STATUS_LABELS: Record<string, string> = {
  new: 'Leadva',
  accepted: 'Elfogadva',
  preparing: 'Készül',
  ready: 'Kész',
  delivering: 'Kiszállítás',
  completed: 'Kézbesítve',
  cancelled: 'Lemondva',
  rejected: 'Elutasítva',
}

interface Props {
  order: Order
  items: OrderItem[]
  config: BusinessConfig
}

export default function OrderTracker({ order: initialOrder, items, config }: Props) {
  const [order, setOrder] = useState(initialOrder)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('order-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => setOrder(payload.new as Order)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [order.id])

  const primary = config.primary_color ?? '#E85D04'
  const currency = config.currency ?? 'HUF'
  const symbol = config.currency_symbol ?? 'Ft'

  const isCancelled = order.status === 'cancelled' || order.status === 'rejected'
  const currentStepIndex = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number])
  const steps = order.order_type === 'delivery' ? STATUS_STEPS : STATUS_STEPS.filter(s => s !== 'delivering')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/menu" className="text-sm text-gray-500 hover:text-gray-900">← {config.business_name}</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Order number + status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Rendelésszám</p>
              <p className="text-2xl font-bold text-gray-900">#{order.order_number}</p>
            </div>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: isCancelled ? '#ef4444' : primary }}
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          {/* Progress bar */}
          {!isCancelled && (
            <div className="mt-6">
              <div className="flex items-center gap-1">
                {steps.map((step, i) => {
                  const stepIndex = STATUS_STEPS.indexOf(step)
                  const done = currentStepIndex >= stepIndex
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${done ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
                        style={done ? { backgroundColor: primary } : {}}
                      >
                        {done ? '✓' : i + 1}
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`flex-1 h-1 mx-1 rounded transition-colors ${currentStepIndex > stepIndex ? '' : 'bg-gray-200'}`}
                          style={currentStepIndex > stepIndex ? { backgroundColor: primary } : {}} />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2">
                {steps.map((step) => (
                  <span key={step} className="text-xs text-gray-500 text-center flex-1">{STATUS_LABELS[step]}</span>
                ))}
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Ez a rendelés le lett mondva vagy elutasítva.
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Rendelt tételek</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.quantity}× {item.item_name}
                  {item.item_size ? ` (${item.item_size})` : ''}
                </span>
                <span className="font-medium text-gray-900">{formatPrice(item.total_price, currency, symbol)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Részösszeg</span>
              <span>{formatPrice(order.subtotal, currency, symbol)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Kiszállítási díj</span>
                <span>{formatPrice(order.delivery_fee, currency, symbol)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t">
              <span>Összesen</span>
              <span>{formatPrice(order.total, currency, symbol)}</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        {order.order_type === 'delivery' && order.delivery_address && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-2">Kiszállítási cím</h2>
            <p className="text-gray-700">{order.delivery_address}, {order.delivery_city}</p>
            {order.order_type === 'delivery' && (
              <p className="text-sm text-gray-500 mt-1">Becsült kiszállítás: ~{config.estimated_delivery_minutes} perc</p>
            )}
          </div>
        )}

        {/* Contact */}
        <div className="text-center text-sm text-gray-500">
          <p>Kérdésed van?</p>
          {config.phone && (
            <a href={`tel:${config.phone}`} className="font-medium text-gray-900 hover:underline">
              Hívj minket: {config.phone}
            </a>
          )}
          <p className="mt-2 text-xs">Rendelés leadva: {formatDateTime(order.placed_at)}</p>
        </div>
      </main>
    </div>
  )
}
