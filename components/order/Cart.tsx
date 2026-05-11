'use client'

import type { BusinessConfig } from '@/types'
import { useCart } from '@/contexts/CartContext'
import { formatPrice } from '@/lib/format'

interface Props {
  config: BusinessConfig | null
  onClose: () => void
  onCheckout: () => void
}

export default function Cart({ config, onClose, onCheckout }: Props) {
  const { state, removeItem, updateQty, total } = useCart()
  const currency = config?.currency ?? 'HUF'
  const symbol = config?.currency_symbol ?? 'Ft'
  const primary = config?.primary_color ?? '#E85D04'

  const deliveryFee = state.orderType === 'delivery'
    ? (config?.delivery_fee_threshold && total >= config.delivery_fee_threshold ? 0 : (config?.delivery_fee ?? 0))
    : 0

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Panel — slides from bottom on mobile, right on desktop */}
      <div className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:right-0 sm:top-0 sm:w-96 sm:h-full bg-white z-50 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-full rounded-t-2xl sm:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-lg text-gray-900">Kosár ({state.items.reduce((s, i) => s + i.quantity, 0)} tétel)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">×</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {state.items.length === 0 ? (
            <p className="text-gray-400 text-center py-12">A kosár üres</p>
          ) : (
            state.items.map((item) => (
              <div key={`${item.menuItemId}-${item.size}`} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm leading-tight">
                    {item.menuItemName}
                    {item.size ? <span className="text-gray-500"> ({item.size})</span> : null}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{formatPrice(item.unitPrice, currency, symbol)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.menuItemId, item.size, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center"
                  >−</button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.menuItemId, item.size, item.quantity + 1)}
                    className="w-7 h-7 rounded-full text-white font-bold flex items-center justify-center"
                    style={{ backgroundColor: primary }}
                  >+</button>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="font-semibold text-sm text-gray-900">{formatPrice(item.unitPrice * item.quantity, currency, symbol)}</p>
                  <button
                    onClick={() => removeItem(item.menuItemId, item.size)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Töröl
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {state.items.length > 0 && (
          <div className="border-t px-5 py-4 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Részösszeg</span>
                <span>{formatPrice(total, currency, symbol)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Kiszállítási díj</span>
                  <span>{formatPrice(deliveryFee, currency, symbol)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
                <span>Összesen</span>
                <span>{formatPrice(total + deliveryFee, currency, symbol)}</span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="w-full text-white py-3.5 rounded-xl font-semibold text-base"
              style={{ backgroundColor: primary }}
            >
              Tovább a megrendeléshez →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
