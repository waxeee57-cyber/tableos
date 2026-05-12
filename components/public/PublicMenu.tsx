'use client'

import { useState, useRef } from 'react'
import type { BusinessConfig, MenuCategory, MenuItem } from '@/types'
import { formatPrice } from '@/lib/format'
import { useCart } from '@/contexts/CartContext'
import Cart from '@/components/order/Cart'
import CheckoutForm from '@/components/order/CheckoutForm'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  config: BusinessConfig | null
  categories: MenuCategory[]
  items: MenuItem[]
  isOpen: boolean
}

export default function PublicMenu({ config, categories, items, isOpen }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const { addItem, itemCount, total } = useCart()

  const primary = config?.primary_color ?? '#E85D04'
  const currency = config?.currency ?? 'HUF'
  const symbol = config?.currency_symbol ?? 'Ft'

  const activeItems = items.filter((i) => i.category_id === activeCategoryId)

  function handleAdd(item: MenuItem, price: number, size: string | null) {
    addItem({
      menuItemId: item.id,
      menuItemName: item.name,
      size,
      quantity: 1,
      unitPrice: price,
    })
  }

  if (checkoutOpen) {
    return (
      <CheckoutForm
        config={config}
        onBack={() => setCheckoutOpen(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config?.logo_url && (
              <Image src={config.logo_url} alt={config.business_name} width={40} height={40} className="rounded-full object-cover" />
            )}
            <div>
              <div className="font-bold text-gray-900">{config?.business_name ?? 'Étterem'}</div>
              {config?.phone && (
                <a href={`tel:${config.phone}`} className="text-xs text-gray-500 hover:text-gray-900">{config.phone}</a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isOpen ? '● Nyitva' : '● Zárva'}
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{config?.business_name ?? 'Étterem'}</h1>
        <p className="text-gray-500 mt-1">{config?.tagline ?? 'Friss ételek, gyors kiszállítás.'}</p>
        {!isOpen && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Jelenleg zárva vagyunk. Rendelést nyitvatartási időben lehet leadni.
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="sticky top-[61px] z-30 bg-white border-b">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide md:overflow-x-visible md:flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                  activeCategoryId === cat.id
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 border-t text-center text-xs text-gray-400 space-x-4">
        <Link href="/terms" className="hover:text-gray-600">ÁSZF</Link>
        <Link href="/privacy" className="hover:text-gray-600">Adatvédelem</Link>
      </footer>

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
          onCheckout={() => {
            setCartOpen(false)
            setCheckoutOpen(true)
          }}
        />
      )}
    </div>
  )
}

function MenuItemCard({
  item,
  currency,
  symbol,
  primaryColor,
  onAdd,
  isOpen,
}: {
  item: MenuItem
  currency: string
  symbol: string
  primaryColor: string
  onAdd: (item: MenuItem, price: number, size: string | null) => void
  isOpen: boolean
}) {
  const multiSize = item.prices.length > 1
  const [selectedIndex, setSelectedIndex] = useState<number | null>(multiSize ? null : 0)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectedPrice = selectedIndex !== null ? (item.prices[selectedIndex] ?? null) : null

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const last = item.prices.length - 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = index < last ? index + 1 : 0
      setSelectedIndex(next)
      buttonRefs.current[next]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = index > 0 ? index - 1 : last
      setSelectedIndex(prev)
      buttonRefs.current[prev]?.focus()
    }
  }

  return (
    <div className="border rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex gap-3">
        {item.image_url && (
          <Image
            src={item.image_url}
            alt={item.name}
            width={80}
            height={80}
            className="rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap">
            <span className="font-semibold text-lg text-gray-900 leading-snug">{item.name}</span>
            {item.is_new && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">ÚJ</span>
            )}
            {item.is_popular && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md font-medium">Népszerű</span>
            )}
          </div>
          <div className="flex gap-1 mt-1">
            {item.is_vegetarian && <span className="text-xs text-green-600" title="Vegetáriánus">🌿</span>}
            {item.is_vegan && <span className="text-xs text-green-700" title="Vegán">🌱</span>}
            {item.is_spicy && <span className="text-xs" title="Csípős">🌶️</span>}
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>
      </div>

      {multiSize ? (
        <>
          {/* Segmented size selector */}
          <div
            role="radiogroup"
            aria-label="Méret választás"
            className="flex rounded-xl overflow-hidden border border-gray-200 divide-x divide-gray-200"
          >
            {item.prices.map((p, i) => {
              const isSelected = selectedIndex === i
              const isTabStop = selectedIndex === null ? i === 0 : isSelected
              return (
                <button
                  key={`${p.size}-${p.price}`}
                  ref={(el) => { buttonRefs.current[i] = el }}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isTabStop ? 0 : -1}
                  onClick={() => setSelectedIndex(i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className="flex-1 flex flex-col items-center py-2 px-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={
                    isSelected
                      ? { backgroundColor: primaryColor, color: '#fff' }
                      : { backgroundColor: '#f9fafb', color: '#374151' }
                  }
                >
                  <span className="leading-tight">{p.size}</span>
                  <span className={`text-xs font-semibold mt-0.5 ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                    {formatPrice(p.price, currency, symbol)}
                  </span>
                </button>
              )
            })}
          </div>

          {isOpen && (
            <button
              disabled={selectedPrice === null}
              onClick={() => {
                if (selectedPrice) onAdd(item, selectedPrice.price, selectedPrice.size)
              }}
              className="w-full text-white text-sm py-2.5 rounded-xl font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor }}
            >
              {selectedPrice === null ? 'Válassz méretet' : '+ Kosárba'}
            </button>
          )}

          {!isOpen && selectedPrice !== null && (
            <div className="text-center font-bold text-lg text-gray-900">
              {formatPrice(selectedPrice.price, currency, symbol)}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between">
          <span className="font-bold text-xl text-gray-900">
            {formatPrice(item.prices[0]?.price ?? 0, currency, symbol)}
          </span>
          {isOpen && (
            <button
              onClick={() => onAdd(item, item.prices[0]?.price ?? 0, item.prices[0]?.size ?? null)}
              className="text-white text-sm px-5 py-2.5 rounded-xl font-semibold"
              style={{ backgroundColor: primaryColor }}
            >
              + Kosárba
            </button>
          )}
        </div>
      )}
    </div>
  )
}
