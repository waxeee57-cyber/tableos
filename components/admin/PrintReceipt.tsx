'use client'

import { formatPrice } from '@/lib/format'

interface CartLine {
  item_name: string
  item_size: string | null
  quantity: number
  unit_price: number
  notes: string
}

export interface PrintReceiptProps {
  businessName: string
  businessAddress?: string
  businessPhone?: string
  orderNumber: string
  customerName: string
  customerPhone: string
  deliveryAddress?: string
  items: CartLine[]
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: string
  kitchenNotes?: string
  deliveryMinutes: number
  currency: string
  symbol: string
}

const PAY_LABELS: Record<string, string> = {
  cash: 'Készpénz',
  card: 'Bankkártya',
  szep_card: 'SZÉP kártya',
}

const DIV = '─'.repeat(32)

export default function PrintReceipt({
  businessName,
  businessAddress,
  businessPhone,
  orderNumber,
  customerName,
  customerPhone,
  deliveryAddress,
  items,
  subtotal,
  deliveryFee,
  total,
  paymentMethod,
  kitchenNotes,
  deliveryMinutes,
  currency,
  symbol,
}: PrintReceiptProps) {
  const now = new Date()
  const dateStr = now.toLocaleString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #__receipt_root__ {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            padding: 6mm !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 12px !important;
            color: #000 !important;
            background: #fff !important;
          }
          @page { margin: 0; size: 80mm auto; }
        }
      `}</style>
      <div
        id="__receipt_root__"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}
        aria-hidden="true"
      >
        <div
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '12px',
            color: '#000',
            width: '68mm',
          }}
        >
          <p style={{ fontWeight: 'bold', fontSize: '14px', textAlign: 'center', margin: '0 0 2px' }}>
            {businessName}
          </p>
          {businessAddress && (
            <p style={{ textAlign: 'center', margin: '0 0 2px' }}>{businessAddress}</p>
          )}
          {businessPhone && (
            <p style={{ textAlign: 'center', margin: '0 0 4px' }}>{businessPhone}</p>
          )}
          <p style={{ margin: '4px 0' }}>{DIV}</p>
          <p style={{ margin: '2px 0' }}>Rendelés: {orderNumber}</p>
          <p style={{ margin: '2px 0' }}>Dátum: {dateStr}</p>
          <p style={{ margin: '2px 0 4px' }}>
            Kiszállítás: ~{deliveryMinutes} perc
          </p>
          <p style={{ margin: '4px 0' }}>{DIV}</p>
          <p style={{ fontWeight: 'bold', margin: '2px 0' }}>{customerName}</p>
          <p style={{ margin: '2px 0' }}>Tel: {customerPhone}</p>
          {deliveryAddress && <p style={{ margin: '2px 0 4px' }}>Cím: {deliveryAddress}</p>}
          <p style={{ margin: '4px 0' }}>{DIV}</p>
          {items.map((item, i) => (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}
            >
              <span>
                {item.quantity}× {item.item_name}
                {item.item_size ? ` ${item.item_size}` : ''}
              </span>
              <span style={{ flexShrink: 0, marginLeft: '8px' }}>
                {formatPrice(item.unit_price * item.quantity, currency, symbol)}
              </span>
            </div>
          ))}
          <p style={{ margin: '4px 0' }}>{DIV}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Részösszeg:</span>
            <span>{formatPrice(subtotal, currency, symbol)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Kiszállítás:</span>
            <span>{formatPrice(deliveryFee, currency, symbol)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '14px',
              margin: '4px 0',
            }}
          >
            <span>ÖSSZESEN:</span>
            <span>{formatPrice(total, currency, symbol)}</span>
          </div>
          <p style={{ margin: '2px 0' }}>
            Fizetés: {PAY_LABELS[paymentMethod] ?? paymentMethod}
          </p>
          {kitchenNotes && (
            <>
              <p style={{ margin: '4px 0' }}>{DIV}</p>
              <p style={{ margin: '2px 0' }}>Megjegyzés:</p>
              <p style={{ margin: '2px 0' }}>{kitchenNotes}</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
