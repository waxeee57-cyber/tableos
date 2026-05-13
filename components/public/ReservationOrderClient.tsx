'use client'

import { useState } from 'react'
import type { BusinessConfig, MenuCategory, MenuItem, Reservation } from '@/types'
import { formatPrice } from '@/lib/format'
import { useCart } from '@/contexts/CartContext'
import Cart from '@/components/order/Cart'
import CheckoutForm from '@/components/order/CheckoutForm'
import Image from 'next/image'

interface Props {
  reservation: Reservation
  config: BusinessConfig
  categories: MenuCategory[]
  items: MenuItem[]
  isOpen: boolean
}

// Build the scheduled_for UTC ISO from reservation date+time in business timezone
function buildScheduledFor(reservation: Reservation, tz: string): string {
  const timeStr = reservation.reservation_time.substring(0, 5)
  const ref = new Date(`${reservation.reservation_date}T${timeStr}:00Z`)
  const tzStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(ref).replace(' ', 'T')
  const diffMs = ref.getTime() - new Date(`${tzStr}:00Z`).getTime()
  return new Date(ref.getTime() + diffMs).toISOString()
}

export default function ReservationOrderClient({ reservation, config, categories, items, isOpen }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const { addItem, itemCount, total } = useCart()

  const primary = config.primary_color ?? '#E85D04'
  const currency = config.currency ?? 'HUF'
  const symbol = config.currency_symbol ?? 'Ft'
  const tz = config.timezone ?? 'Europe/Budapest'

  const scheduledFor = buildScheduledFor(reservation, tz)
  const time = reservation.reservation_time.substring(0, 5)

  const activeItems = items.filter((i) => i.category_id === activeCategoryId)

  function handleAdd(item: MenuItem, price: number, size: string | null) {
    addItem({ menuItemId: item.id, menuItemName: item.name, size, quantity: 1, unitPrice: price })
  }

  if (checkoutOpen) {
    return (
      <CheckoutForm
        config={config}
        onBack={() => setCheckoutOpen(false)}
        forceOrderType="dine_in"
        forceIsScheduled
        forceScheduledFor={scheduledFor}
        prefillName={reservation.customer_name}
        prefillPhone={reservation.customer_phone}
        reservationId={reservation.id}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.logo_url && (
              <Image src={config.logo_url} alt={config.business_name} width={36} height={36} className="rounded-full object-cover" />
            )}
            <div>
              <div className="font-bold text-gray-900">{config.business_name}</div>
              <div className="text-xs text-gray-500">Előrendelés a foglaláshoz</div>
            </div>
          </div>
        </div>
      </header>

      {/* Reservation summary */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-purple-900">
              {reservation.reservation_date} · {time} · {reservation.party_size} fő
            </p>
            <p className="text-sm text-purple-700">
              A rendelés az asztalhoz érkezéskor kerül kiszolgálásra.
            </p>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-[61px] z-30 bg-white border-b">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                  activeCategoryId === cat.id ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeCategoryId === cat.id ? { backgroundColor: primary } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeItems.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Ebben a kategóriában nincsenek elérhető ételek.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                currency={currency}
                symbol={symbol}
                primaryColor={primary}
                onAdd={handleAdd}
                isOpen={isOpen}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {itemCount > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between text-white py-4 px-6 rounded-xl font-semibold text-base"
            style={{ backgroundColor: primary }}
          >
            <span className="bg-white bg-opacity-20 rounded-lg px-2 py-0.5 text-sm">{itemCount} tétel</span>
            <span>Kosár megtekintése</span>
            <span>{formatPrice(total, currency, symbol)}</span>
          </button>
        </div>
      )}

      {/* Cart panel */}
      {cartOpen && (
        <Cart
          config={config}
          onClose={() => setCartOpen(false)}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true) }}
        />
      )}
    </div>
  )
}

function MenuItemCard({
  item, currency, symbol, primaryColor, onAdd, isOpen,
}: {
  item: MenuItem; currency: string; symbol: string; primaryColor: string
  onAdd: (item: MenuItem, price: number, size: string | null) => void; isOpen: boolean
}) {
  const multiSize = item.prices.length > 1
  return (
    <div className="border rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow bg-white">
      <div className="flex gap-3">
        {item.image_url && (
          <Image src={item.image_url} alt={item.name} width={72} height={72} className="rounded-lg object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900">{item.name}</span>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>
      </div>
      {multiSize ? (
        <div className="space-y-2">
          {item.prices.map((p) => (
            <div key={`${p.size}-${p.price}`} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{p.size}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{formatPrice(p.price, currency, symbol)}</span>
                {isOpen && (
                  <button onClick={() => onAdd(item, p.price, p.size)} className="text-white text-sm px-3 py-1 rounded-lg font-medium" style={{ backgroundColor: primaryColor }}>
                    + Kosárba
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900">{formatPrice(item.prices[0]?.price ?? 0, currency, symbol)}</span>
          {isOpen && (
            <button onClick={() => onAdd(item, item.prices[0]?.price ?? 0, item.prices[0]?.size ?? null)} className="text-white text-sm px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: primaryColor }}>
              + Kosárba
            </button>
          )}
        </div>
      )}
    </div>
  )
}
