'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessConfig, OrderType } from '@/types'
import { useCart } from '@/contexts/CartContext'
import { formatPrice } from '@/lib/format'

interface Props {
  config: BusinessConfig | null
  onBack: () => void
  // Feature 1 — optional scheduling overrides
  forceOrderType?: OrderType
  forceIsScheduled?: boolean
  forceScheduledFor?: string
  prefillName?: string
  prefillPhone?: string
  // Feature 3 — reservation linkage
  reservationId?: string
}

type PaymentMethod = 'cash' | 'card' | 'szep_card'

// ──────────────────────────────────────────────────────────────────────────────
// Scheduling helpers
// ──────────────────────────────────────────────────────────────────────────────

function getDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date())
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function generateAvailableDates(
  daysAhead: number,
  operatingHours: BusinessConfig['operating_hours'],
  tz: string,
): string[] {
  const todayStr = todayInTimezone(tz)
  const [ty, tm, td] = todayStr.split('-').map(Number)
  const dates: string[] = []

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(ty, tm - 1, td + i)
    const dateStr = getDateString(d)
    const dayKey = DAY_KEYS[d.getDay()]
    if (operatingHours[dayKey]) {
      dates.push(dateStr)
    }
  }
  return dates
}

function generateTimeSlots(
  openTime: string,
  closeTime: string,
  slotMinutes: number,
  selectedDate: string,
  tz: string,
): string[] {
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)
  const openTotal = openH * 60 + openM
  const closeTotal = closeH * 60 + closeM

  const todayStr = todayInTimezone(tz)
  const isToday = selectedDate === todayStr

  let nowMinutes = 0
  if (isToday) {
    const nowStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz,
      hour: '2-digit', minute: '2-digit',
    }).format(new Date())
    const [nh, nm] = nowStr.split(':').map(Number)
    nowMinutes = nh * 60 + nm
  }

  const slots: string[] = []
  let cursor = openTotal
  while (cursor < closeTotal) {
    if (!isToday || cursor > nowMinutes) {
      const h = String(Math.floor(cursor / 60)).padStart(2, '0')
      const m = String(cursor % 60).padStart(2, '0')
      slots.push(`${h}:${m}`)
    }
    cursor += slotMinutes
  }
  return slots
}

// Convert naive dateStr+timeStr in business tz to UTC ISO string
function toUTCIso(dateStr: string, timeStr: string, tz: string): string {
  const ref = new Date(`${dateStr}T${timeStr}:00Z`)
  const tzStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(ref).replace(' ', 'T')
  const diffMs = ref.getTime() - new Date(`${tzStr}:00Z`).getTime()
  return new Date(ref.getTime() + diffMs).toISOString()
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function CheckoutForm({
  config,
  onBack,
  forceOrderType,
  forceIsScheduled,
  forceScheduledFor,
  prefillName = '',
  prefillPhone = '',
  reservationId,
}: Props) {
  const router = useRouter()
  const { state, total, clear } = useCart()

  const defaultOrderType = forceOrderType
    ?? (config?.delivery_enabled ? 'delivery' : 'takeaway')

  const [orderType, setOrderType] = useState<OrderType>(defaultOrderType)
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scheduling state
  const schedulingEnabled = config?.scheduling_enabled ?? false
  const tz = config?.timezone ?? 'Europe/Budapest'
  const daysAhead = config?.scheduling_days_ahead ?? 7
  const slotMinutes = config?.scheduling_slot_minutes ?? 30

  const [scheduleMode, setScheduleMode] = useState<'asap' | 'scheduled'>(
    forceIsScheduled ? 'scheduled' : 'asap'
  )

  const availableDates = schedulingEnabled && config
    ? generateAvailableDates(daysAhead, config.operating_hours, tz)
    : []

  const [schedDate, setSchedDate] = useState<string>(availableDates[0] ?? '')
  const [schedTime, setSchedTime] = useState<string>('')

  const dayKey = schedDate ? DAY_KEYS[new Date(schedDate + 'T12:00:00').getDay()] : ''
  const dayHours = (dayKey && config) ? config.operating_hours[dayKey] : null
  const timeSlots = (dayHours && schedDate)
    ? generateTimeSlots(dayHours.open, dayHours.close, slotMinutes, schedDate, tz)
    : []

  const primary = config?.primary_color ?? '#E85D04'
  const currency = config?.currency ?? 'HUF'
  const symbol = config?.currency_symbol ?? 'Ft'

  const deliveryFee = orderType === 'delivery'
    ? (config?.delivery_fee_threshold && total >= config.delivery_fee_threshold ? 0 : (config?.delivery_fee ?? 0))
    : 0

  const [form, setForm] = useState({
    name: prefillName,
    phone: prefillPhone,
    email: '',
    address: '',
    city: '',
    postal_code: '',
    notes: '',
  })

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) return setError('A név megadása kötelező.')
    if (!form.phone.trim()) return setError('A telefonszám megadása kötelező.')
    if (orderType === 'delivery' && !form.address.trim()) return setError('A cím megadása kötelező.')
    if (orderType === 'delivery' && !form.city.trim()) return setError('A település megadása kötelező.')
    if (state.items.length === 0) return setError('A kosár üres.')

    const isScheduled = forceIsScheduled ?? (scheduleMode === 'scheduled')
    let scheduledFor: string | null = forceScheduledFor ?? null

    if (isScheduled && !scheduledFor) {
      if (!schedDate) return setError('Válassz dátumot az előrendeléshez.')
      if (!schedTime) return setError('Válassz időpontot az előrendeléshez.')
      scheduledFor = toUTCIso(schedDate, schedTime, tz)
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType,
          paymentMethod: payment,
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email || null,
          },
          delivery: orderType === 'delivery' ? {
            address: form.address,
            city: form.city,
            postalCode: form.postal_code || null,
            notes: form.notes || null,
          } : null,
          notes: orderType !== 'delivery' ? form.notes || null : null,
          is_scheduled: isScheduled,
          scheduled_for: scheduledFor,
          reservation_id: reservationId ?? null,
          items: state.items.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.menuItemName,
            size: i.size,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Hiba történt. Próbáld újra.')
        return
      }

      clear()
      router.push(`/order/${data.orderId}`)
    } catch {
      setError('Hálózati hiba. Ellenőrizd az internetkapcsolatod.')
    } finally {
      setLoading(false)
    }
  }

  const isOrderTypeLocked = !!forceOrderType

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-900">← Vissza</button>
          <span className="font-bold text-gray-900">Megrendelés</span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Order type */}
        {!isOrderTypeLocked && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Rendelés típusa</h2>
            <div className="flex gap-2">
              {config?.delivery_enabled && (
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${orderType === 'delivery' ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                  style={orderType === 'delivery' ? { backgroundColor: primary, borderColor: primary } : {}}
                >
                  🚴 Kiszállítás
                </button>
              )}
              {config?.takeaway_enabled && (
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${orderType === 'takeaway' ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                  style={orderType === 'takeaway' ? { backgroundColor: primary, borderColor: primary } : {}}
                >
                  🛍️ Elvitel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scheduling — only shown when enabled and not forced */}
        {schedulingEnabled && !forceIsScheduled && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Mikor szeretnéd?</h2>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setScheduleMode('asap')}
                className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${scheduleMode === 'asap' ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                style={scheduleMode === 'asap' ? { backgroundColor: primary, borderColor: primary } : {}}
              >
                Minél hamarabb
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('scheduled')}
                className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${scheduleMode === 'scheduled' ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                style={scheduleMode === 'scheduled' ? { backgroundColor: primary, borderColor: primary } : {}}
              >
                📅 Időpontra rendelek
              </button>
            </div>

            {scheduleMode === 'scheduled' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dátum *</label>
                  <select
                    value={schedDate}
                    onChange={(e) => { setSchedDate(e.target.value); setSchedTime('') }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    required
                  >
                    <option value="">Válassz dátumot...</option>
                    {availableDates.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {schedDate && timeSlots.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Időpont *</label>
                    <select
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                      required
                    >
                      <option value="">Válassz időpontot...</option>
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {schedDate && timeSlots.length === 0 && (
                  <p className="text-sm text-amber-700">Erre a napra nincs elérhető időpont.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Customer info */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Személyes adatok</h2>
          <Field label="Teljes név *" value={form.name} onChange={(v) => set('name', v)} placeholder="Kiss János" />
          <Field label="Telefonszám *" value={form.phone} onChange={(v) => set('phone', v)} placeholder="06/30 123-4567" type="tel" />
          <Field label="E-mail (opcionális)" value={form.email} onChange={(v) => set('email', v)} placeholder="pelda@email.hu" type="email" />
        </div>

        {/* Delivery address */}
        {orderType === 'delivery' && (
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Kiszállítási cím</h2>
            <Field label="Utca, házszám *" value={form.address} onChange={(v) => set('address', v)} placeholder="Kossuth utca 12." />
            <Field label="Település *" value={form.city} onChange={(v) => set('city', v)} placeholder="Budapest" />
            <Field label="Irányítószám" value={form.postal_code} onChange={(v) => set('postal_code', v)} placeholder="1234" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Megjegyzés</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                rows={3}
                placeholder="Pl. 3. emelet, csengő neve..."
              />
            </div>
          </div>
        )}

        {orderType !== 'delivery' && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Megjegyzés</h2>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              rows={3}
              placeholder="Megjegyzés a rendeléshez..."
            />
          </div>
        )}

        {/* Payment */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Fizetési mód</h2>
          <div className="space-y-2">
            {[
              { value: 'cash', label: 'Készpénz' },
              { value: 'card', label: 'Bankkártya' },
              { value: 'szep_card', label: 'SZÉP kártya' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value={value}
                  checked={payment === value}
                  onChange={() => setPayment(value as PaymentMethod)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Összesítő</h2>
          <div className="space-y-1 text-sm">
            {state.items.map((item) => (
              <div key={`${item.menuItemId}-${item.size}`} className="flex justify-between text-gray-600">
                <span>{item.quantity}× {item.menuItemName}{item.size ? ` (${item.size})` : ''}</span>
                <span>{formatPrice(item.unitPrice * item.quantity, currency, symbol)}</span>
              </div>
            ))}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Kiszállítási díj</span>
                <span>{formatPrice(deliveryFee, currency, symbol)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t">
              <span>Összesen</span>
              <span>{formatPrice(total + deliveryFee, currency, symbol)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white py-4 rounded-xl font-semibold text-base disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {loading ? 'Rendelés leadása...' : 'Megrendelés leadása →'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
      />
    </div>
  )
}
