'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus, X, Search, ChevronDown, ChevronRight } from 'lucide-react'
import type { MenuCategory, MenuItem, DeliveryZone, BusinessConfig, Customer } from '@/types'
import { formatPrice, timeAgo } from '@/lib/format'
import PrintReceipt from '@/components/admin/PrintReceipt'

interface CartLine {
  id: string
  menu_item_id: string
  item_name: string
  item_size: string | null
  quantity: number
  unit_price: number
  notes: string
}

interface SavedOrderInfo {
  orderId: string
  orderNumber: string
  customerName: string
  total: number
  deliveryMinutes: number
}

interface Props {
  categories: MenuCategory[]
  items: MenuItem[]
  deliveryZones: DeliveryZone[]
  config: BusinessConfig
}

function calcDeliveryFee(city: string, zones: DeliveryZone[], config: BusinessConfig): number {
  if (!city.trim()) return config.delivery_fee
  const lower = city.toLowerCase().trim()
  const match = zones.find((z) => z.areas.toLowerCase().includes(lower))
  return match ? match.delivery_fee : config.delivery_fee
}

export default function AdminNewOrderClient({ categories, items, deliveryZones, config }: Props) {
  const router = useRouter()

  // Customer state
  const [phoneQuery, setPhoneQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerCity, setCustomerCity] = useState('')
  const [customerPostalCode, setCustomerPostalCode] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  // Menu state
  const [menuSearch, setMenuSearch] = useState('')
  const [menuResults, setMenuResults] = useState<MenuItem[]>([])
  const [searchHighlight, setSearchHighlight] = useState(0)
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(categories.slice(0, 1).map((c) => c.id))
  )

  // Cart state
  const [cart, setCart] = useState<CartLine[]>([])
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  // Order options
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'szep_card'>('cash')
  const [deliveryMinutes, setDeliveryMinutes] = useState(config.estimated_delivery_minutes)
  const [kitchenNotes, setKitchenNotes] = useState('')

  // UI state
  const [cartOpen, setCartOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOrder, setSavedOrder] = useState<SavedOrderInfo | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const phoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Computed
  const subtotal = cart.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  const deliveryFee = orderType === 'takeaway' ? 0 : calcDeliveryFee(customerCity, deliveryZones, config)
  const total = subtotal + deliveryFee
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0)
  const customerIdentified = !!(selectedCustomer || (customerName.trim() && customerPhone.trim()))
  const canSave =
    customerIdentified &&
    cart.length > 0 &&
    (orderType === 'takeaway' || customerAddress.trim().length > 0)

  // Phone search
  useEffect(() => {
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current)
    const digits = phoneQuery.replace(/\D/g, '')
    if (digits.length < 3) {
      setCustomerResults([])
      return
    }
    phoneDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/customers/search?phone=${encodeURIComponent(phoneQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setCustomerResults(data.customers ?? [])
        }
      } catch {
        // network error — silent
      }
    }, 200)
    return () => {
      if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current)
    }
  }, [phoneQuery])

  // Menu search
  useEffect(() => {
    if (menuDebounceRef.current) clearTimeout(menuDebounceRef.current)
    if (!menuSearch.trim()) {
      setMenuResults([])
      setSearchHighlight(0)
      return
    }
    menuDebounceRef.current = setTimeout(() => {
      const q = menuSearch.toLowerCase()
      const results = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
      )
      setMenuResults(results)
      setSearchHighlight(0)
    }, 100)
    return () => {
      if (menuDebounceRef.current) clearTimeout(menuDebounceRef.current)
    }
  }, [menuSearch, items])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setCustomerName(c.name)
    setCustomerPhone(c.phone)
    setCustomerAddress(c.address ?? '')
    setCustomerCity(c.city ?? '')
    setCustomerPostalCode(c.postal_code ?? '')
    setCustomerNotes(c.notes ?? '')
    setPhoneQuery(c.phone)
    setCustomerResults([])
    if (c.preferred_payment_method === 'card') setPaymentMethod('card')
    else if (c.preferred_payment_method === 'szep_card') setPaymentMethod('szep_card')
    else setPaymentMethod('cash')
  }

  function addToCart(item: MenuItem, size: string | null, price: number) {
    const key = item.id + (size ?? '')
    setCart((prev) => {
      const existing = prev.find((l) => l.id === key)
      if (existing) {
        return prev.map((l) => (l.id === key ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [
        ...prev,
        { id: key, menu_item_id: item.id, item_name: item.name, item_size: size, quantity: 1, unit_price: price, notes: '' },
      ]
    })
  }

  function updateQuantity(id: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
    )
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((l) => l.id !== id))
    setExpandedNotes((prev) => {
      const s = new Set(prev)
      s.delete(id)
      return s
    })
  }

  function updateItemNote(id: string, note: string) {
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, notes: note } : l)))
  }

  function toggleNoteExpand(id: string) {
    setExpandedNotes((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function toggleCategory(id: string) {
    setOpenCategories((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (menuResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSearchHighlight((h) => Math.min(h + 1, menuResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSearchHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = menuResults[searchHighlight]
      if (item && item.prices[0]) {
        addToCart(item, item.prices[0].size, item.prices[0].price)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMenuSearch('')
    }
  }

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/orders/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer?.id ?? null,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: selectedCustomer?.email ?? null,
          order_type: orderType,
          delivery_address: orderType === 'delivery' ? customerAddress.trim() || null : null,
          delivery_city: orderType === 'delivery' ? customerCity.trim() || null : null,
          delivery_postal_code: orderType === 'delivery' ? customerPostalCode.trim() || null : null,
          delivery_notes: customerNotes.trim() || null,
          delivery_fee: deliveryFee,
          items: cart.map((l) => ({
            menu_item_id: l.menu_item_id,
            item_name: l.item_name,
            item_size: l.item_size,
            quantity: l.quantity,
            unit_price: l.unit_price,
            notes: l.notes || null,
          })),
          payment_method: paymentMethod,
          customer_notes: kitchenNotes.trim() || null,
          estimated_delivery_minutes: deliveryMinutes,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setToast(err.error ?? 'Hiba történt a mentés során')
        return
      }

      const data = await res.json()
      if (data.autoLinkedCustomer) {
        setToast(`Vendég automatikusan összekapcsolva: ${data.autoLinkedCustomer}`)
      }
      setSavedOrder({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        customerName: customerName.trim(),
        total,
        deliveryMinutes,
      })
    } finally {
      setSaving(false)
    }
  }

  function startNewOrder() {
    setSavedOrder(null)
    setPhoneQuery('')
    setCustomerResults([])
    setSelectedCustomer(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setCustomerCity('')
    setCustomerPostalCode('')
    setCustomerNotes('')
    setMenuSearch('')
    setMenuResults([])
    setCart([])
    setExpandedNotes(new Set())
    setOrderType('delivery')
    setPaymentMethod('cash')
    setDeliveryMinutes(config.estimated_delivery_minutes)
    setKitchenNotes('')
    setCartOpen(false)
  }

  const cartPanel = (
    <CartPanel
      cart={cart}
      expandedNotes={expandedNotes}
      onToggleNote={toggleNoteExpand}
      onUpdateQuantity={updateQuantity}
      onRemove={removeFromCart}
      onUpdateNote={updateItemNote}
      orderType={orderType}
      setOrderType={setOrderType}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      deliveryMinutes={deliveryMinutes}
      setDeliveryMinutes={setDeliveryMinutes}
      kitchenNotes={kitchenNotes}
      setKitchenNotes={setKitchenNotes}
      subtotal={subtotal}
      deliveryFee={deliveryFee}
      total={total}
      canSave={canSave}
      cartEmpty={cart.length === 0}
      customerIdentified={customerIdentified}
      saving={saving}
      onSave={handleSave}
      config={config}
    />
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm max-w-xs">
          {toast}
        </div>
      )}

      {/* Print receipt (off-screen, visible only when printing) */}
      {savedOrder && (
        <PrintReceipt
          businessName={config.business_name}
          businessAddress={config.address ?? undefined}
          businessPhone={config.phone ?? undefined}
          orderNumber={savedOrder.orderNumber}
          customerName={savedOrder.customerName}
          customerPhone={customerPhone}
          deliveryAddress={
            orderType === 'delivery' && customerAddress
              ? `${customerAddress}, ${customerCity}`
              : undefined
          }
          items={cart}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          total={savedOrder.total}
          paymentMethod={paymentMethod}
          kitchenNotes={kitchenNotes || undefined}
          deliveryMinutes={savedOrder.deliveryMinutes}
          currency={config.currency}
          symbol={config.currency_symbol}
        />
      )}

      {/* Success modal */}
      {savedOrder && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">✓</div>
              <h2 className="text-xl font-bold text-gray-900">Rendelés mentve</h2>
            </div>
            <div className="space-y-1.5 text-sm text-gray-700 mb-6 bg-gray-50 rounded-xl p-4">
              <p>
                <span className="text-gray-500">Rendelésszám: </span>
                <strong>{savedOrder.orderNumber}</strong>
              </p>
              <p>
                <span className="text-gray-500">Vendég: </span>
                {savedOrder.customerName}
              </p>
              <p>
                <span className="text-gray-500">Összeg: </span>
                {formatPrice(savedOrder.total, config.currency, config.currency_symbol)}
              </p>
              <p>
                <span className="text-gray-500">Kiszállítás: </span>~{savedOrder.deliveryMinutes} perc
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Nyomtatás
              </button>
              <button
                onClick={startNewOrder}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
              >
                Új rendelés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-900 p-1 text-sm"
        >
          ← Vissza
        </button>
        <h1 className="text-lg font-bold text-gray-900">Új rendelés (telefon)</h1>
        {selectedCustomer?.is_vip && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
            {selectedCustomer.name} ⭐
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6 pb-32 lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">

          {/* LEFT: Customer + Menu */}
          <div className="w-full lg:flex-[3] space-y-4">

            {/* Customer section */}
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Vásárló</h2>

              {/* Phone search */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">Telefon (keresés)</label>
                <input
                  type="tel"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="+36 30 ..."
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {/* Customer results */}
                {customerResults.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {customerResults.map((c) => (
                      <CustomerCard key={c.id} customer={c} config={config} onSelect={() => selectCustomer(c)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Selected customer summary */}
              {selectedCustomer && (
                <div className="mb-3 text-xs text-gray-500 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                  <span className="font-medium text-orange-700">{selectedCustomer.name}</span>
                  {' · '}
                  {selectedCustomer.order_count} rendelés
                  {' · '}
                  {formatPrice(selectedCustomer.total_spent, config.currency, config.currency_symbol)}
                  {selectedCustomer.last_order_at && (
                    <> · Utolsó: {timeAgo(selectedCustomer.last_order_at)}</>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomer(null)
                      setPhoneQuery('')
                    }}
                    className="ml-2 text-orange-400 hover:text-orange-700"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs text-gray-400">vendég adatai</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              {/* Manual entry fields */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Név *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Telefon *</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Cím *</label>
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Település *</label>
                        <input
                          type="text"
                          value={customerCity}
                          onChange={(e) => setCustomerCity(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Irányítószám</label>
                        <input
                          type="text"
                          value={customerPostalCode}
                          onChange={(e) => setCustomerPostalCode(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Megjegyzés</label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Menu section */}
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Étlap</h2>

              {/* Search bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Keresés..."
                    className="w-full border rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {menuSearch && (
                    <button
                      onClick={() => {
                        setMenuSearch('')
                        setMenuResults([])
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search results */}
                {menuResults.length > 0 && (
                  <div className="mt-2 border rounded-xl divide-y bg-white shadow-lg overflow-hidden">
                    {menuResults.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-3 transition-colors ${idx === searchHighlight ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="font-medium text-sm text-gray-900 mb-1.5">{item.name}</div>
                        <div className="flex flex-wrap gap-2">
                          {item.prices.map((price) => (
                            <button
                              key={price.size ?? 'single'}
                              onClick={() => addToCart(item, price.size, price.price)}
                              className="min-h-[44px] px-3 py-2 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 font-medium flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              {price.size && <span>{price.size} — </span>}
                              <span>{formatPrice(price.price, config.currency, config.currency_symbol)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {menuSearch && menuResults.length === 0 && (
                  <p className="mt-2 text-sm text-gray-400 text-center py-2">Nincs találat</p>
                )}
              </div>

              {/* Category filter tabs */}
              <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                      openCategories.has(cat.id)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Category sections */}
              <div className="space-y-3">
                {categories.map((cat) => {
                  const catItems = items.filter((i) => i.category_id === cat.id)
                  if (catItems.length === 0) return null
                  const isOpen = openCategories.has(cat.id)
                  return (
                    <div key={cat.id} className="border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className="flex items-center justify-between w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-medium text-gray-800 text-sm">{cat.name}</span>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="divide-y">
                          {catItems.map((item) => (
                            <MenuItemRow
                              key={item.id}
                              item={item}
                              config={config}
                              onAdd={addToCart}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Cart (desktop only) */}
          <div className="hidden lg:block lg:flex-[2] sticky top-20">{cartPanel}</div>
        </div>
      </div>

      {/* Mobile: sticky cart bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-white border-t p-3 flex items-center gap-2 z-20 shadow-lg">
        <button
          onClick={() => setCartOpen(true)}
          className="flex-1 flex items-center justify-between bg-orange-50 rounded-xl px-4 min-h-[44px]"
        >
          <span className="text-sm font-medium text-orange-700">
            {cartCount > 0 ? `${cartCount} tétel` : 'Üres kosár'}
          </span>
          <span className="font-bold text-orange-600">
            {formatPrice(total, config.currency, config.currency_symbol)}
          </span>
        </button>
        <button
          onClick={() => setCartOpen(true)}
          className="bg-orange-500 text-white rounded-xl px-4 min-h-[44px] text-sm font-bold hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          Megrendelés →
        </button>
      </div>

      {/* Mobile cart sheet */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 flex flex-col justify-end">
          <div className="bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-semibold text-gray-900">Kosár</h2>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <CartPanel
                cart={cart}
                expandedNotes={expandedNotes}
                onToggleNote={toggleNoteExpand}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                onUpdateNote={updateItemNote}
                orderType={orderType}
                setOrderType={setOrderType}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                deliveryMinutes={deliveryMinutes}
                setDeliveryMinutes={setDeliveryMinutes}
                kitchenNotes={kitchenNotes}
                setKitchenNotes={setKitchenNotes}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                total={total}
                canSave={canSave}
                cartEmpty={cart.length === 0}
                customerIdentified={customerIdentified}
                saving={saving}
                onSave={() => {
                  setCartOpen(false)
                  handleSave()
                }}
                config={config}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CustomerCard({
  customer,
  config,
  onSelect,
}: {
  customer: Customer
  config: BusinessConfig
  onSelect: () => void
}) {
  return (
    <div className="border rounded-xl p-3 hover:border-orange-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900">
            {customer.name}
            {customer.is_vip && <span className="ml-1 text-yellow-500">⭐</span>}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {customer.order_count} rendelés
            {' · '}
            {formatPrice(customer.total_spent, config.currency, config.currency_symbol)}
            {customer.last_order_at && <> · {timeAgo(customer.last_order_at)}</>}
          </div>
          {(customer.address || customer.city) && (
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {[customer.address, customer.city].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        <button
          onClick={onSelect}
          className="flex-shrink-0 min-h-[44px] px-3 py-2 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 font-medium whitespace-nowrap transition-colors"
        >
          Kiválasztás
        </button>
      </div>
    </div>
  )
}

function MenuItemRow({
  item,
  config,
  onAdd,
}: {
  item: MenuItem
  config: BusinessConfig
  onAdd: (item: MenuItem, size: string | null, price: number) => void
}) {
  return (
    <div className="px-4 py-3">
      <div className="font-medium text-sm text-gray-900 mb-2">{item.name}</div>
      <div className="flex flex-wrap gap-2">
        {item.prices.map((price) => (
          <button
            key={price.size ?? 'single'}
            onClick={() => onAdd(item, price.size, price.price)}
            className="min-h-[44px] min-w-[44px] px-3 py-2 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-orange-50 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {price.size && <span>{price.size}</span>}
            <span>{formatPrice(price.price, config.currency, config.currency_symbol)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

interface CartPanelProps {
  cart: CartLine[]
  expandedNotes: Set<string>
  onToggleNote: (id: string) => void
  onUpdateQuantity: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onUpdateNote: (id: string, note: string) => void
  orderType: 'delivery' | 'takeaway'
  setOrderType: (v: 'delivery' | 'takeaway') => void
  paymentMethod: 'cash' | 'card' | 'szep_card'
  setPaymentMethod: (v: 'cash' | 'card' | 'szep_card') => void
  deliveryMinutes: number
  setDeliveryMinutes: (v: number) => void
  kitchenNotes: string
  setKitchenNotes: (v: string) => void
  subtotal: number
  deliveryFee: number
  total: number
  canSave: boolean
  cartEmpty: boolean
  customerIdentified: boolean
  saving: boolean
  onSave: () => void
  config: BusinessConfig
}

function CartPanel({
  cart,
  expandedNotes,
  onToggleNote,
  onUpdateQuantity,
  onRemove,
  onUpdateNote,
  orderType,
  setOrderType,
  paymentMethod,
  setPaymentMethod,
  deliveryMinutes,
  setDeliveryMinutes,
  kitchenNotes,
  setKitchenNotes,
  subtotal,
  deliveryFee,
  total,
  canSave,
  cartEmpty,
  customerIdentified,
  saving,
  onSave,
  config,
}: CartPanelProps) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <h2 className="font-semibold text-gray-900">Kosár</h2>

      {/* Items */}
      {cart.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Üres kosár</p>
      ) : (
        <div className="space-y-3">
          {cart.map((line) => (
            <div key={line.id} className="border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {line.item_name}
                    {line.item_size && (
                      <span className="text-gray-500 font-normal"> ({line.item_size})</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatPrice(line.unit_price * line.quantity, config.currency, config.currency_symbol)}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(line.id, -1)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-gray-900">
                    {line.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(line.id, 1)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRemove(line.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Per-item note */}
              {expandedNotes.has(line.id) ? (
                <input
                  type="text"
                  value={line.notes}
                  onChange={(e) => onUpdateNote(line.id, e.target.value)}
                  placeholder="Megjegyzés az ételhez..."
                  className="mt-1.5 w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              ) : (
                <button
                  onClick={() => onToggleNote(line.id)}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  + Megjegyzés
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="space-y-1 text-sm border-t pt-3">
        <div className="flex justify-between text-gray-600">
          <span>Részösszeg</span>
          <span>{formatPrice(subtotal, config.currency, config.currency_symbol)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Kiszállítás</span>
          <span>{formatPrice(deliveryFee, config.currency, config.currency_symbol)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t">
          <span>Összesen</span>
          <span>{formatPrice(total, config.currency, config.currency_symbol)}</span>
        </div>
      </div>

      {/* Order type */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Rendelés típusa</p>
        <div className="flex gap-2">
          {(
            [
              { value: 'delivery', label: '🚴 Kiszállítás' },
              { value: 'takeaway', label: '🛍️ Elvitel' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOrderType(opt.value)}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                orderType === opt.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Fizetési mód</p>
        <div className="flex gap-2">
          {(
            [
              { value: 'cash', label: 'Készpénz' },
              { value: 'card', label: 'Bankkártya' },
              { value: 'szep_card', label: 'SZÉP' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPaymentMethod(opt.value)}
              className={`flex-1 min-h-[44px] px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                paymentMethod === opt.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kitchen notes */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Megjegyzés a konyhának</p>
        <textarea
          value={kitchenNotes}
          onChange={(e) => setKitchenNotes(e.target.value)}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
        />
      </div>

      {/* Delivery minutes */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Becsült kiszállítás</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={deliveryMinutes}
            onChange={(e) =>
              setDeliveryMinutes(Math.min(180, Math.max(0, parseInt(e.target.value) || 0)))
            }
            min={0}
            max={180}
            className="w-20 border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-600">perc</span>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={!canSave || saving}
        className="w-full min-h-[44px] bg-orange-500 text-white font-bold rounded-xl py-3 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {saving ? 'Mentés...' : 'Mentés és nyomtatás'}
      </button>

      {!canSave && (
        <p className="text-xs text-gray-400 text-center -mt-2">
          {cartEmpty
            ? 'Adj hozzá legalább egy ételt'
            : !customerIdentified
            ? 'Add meg a vendég adatait'
            : 'Add meg a szállítási címet'}
        </p>
      )}
    </div>
  )
}
