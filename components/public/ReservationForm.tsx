'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessConfig } from '@/types'

interface Props {
  config: BusinessConfig
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function getDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(new Date())
}

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

export default function ReservationForm({ config }: Props) {
  const router = useRouter()
  const tz = config.timezone ?? 'Europe/Budapest'
  const daysAhead = config.reservations_days_ahead ?? 60
  const slotMinutes = config.reservations_slot_minutes ?? 30
  const maxParty = config.max_party_size ?? 20
  const primary = config.primary_color ?? '#E85D04'

  const availableDates = generateAvailableDates(daysAhead, config.operating_hours, tz)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }))
    if (k === 'reservation_date') setForm((p) => ({ ...p, reservation_date: v as string, reservation_time: '' }))
  }

  const dayKey = form.reservation_date
    ? DAY_KEYS[new Date(form.reservation_date + 'T12:00:00').getDay()]
    : ''
  const dayHours = dayKey ? config.operating_hours[dayKey] : null
  const timeSlots = (dayHours && form.reservation_date)
    ? generateTimeSlots(dayHours.open, dayHours.close, slotMinutes, form.reservation_date, tz)
    : []

  const isValid =
    form.customer_name.trim().length >= 2 &&
    form.customer_phone.trim().length >= 6 &&
    form.party_size >= 1 &&
    form.party_size <= maxParty &&
    !!form.reservation_date &&
    !!form.reservation_time

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_email: form.customer_email.trim() || undefined,
          party_size: form.party_size,
          reservation_date: form.reservation_date,
          reservation_time: form.reservation_time,
          notes: form.notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Hiba történt. Próbáld újra.')
        return
      }

      router.push(`/reserve/${data.reservationId}/confirmation`)
    } catch {
      setError('Hálózati hiba. Ellenőrizd az internetkapcsolatod.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="font-bold text-gray-900 text-lg">Asztalt foglalok</h1>
          <p className="text-sm text-gray-500">{config.business_name}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Personal info */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Személyes adatok</h2>
          <Field
            label="Teljes név *"
            value={form.customer_name}
            onChange={(v) => setForm((p) => ({ ...p, customer_name: v }))}
            placeholder="Kiss János"
          />
          <Field
            label="Telefonszám *"
            value={form.customer_phone}
            onChange={(v) => setForm((p) => ({ ...p, customer_phone: v }))}
            placeholder="06/30 123-4567"
            type="tel"
          />
          <Field
            label="E-mail (opcionális)"
            value={form.customer_email}
            onChange={(v) => setForm((p) => ({ ...p, customer_email: v }))}
            placeholder="pelda@email.hu"
            type="email"
          />
        </div>

        {/* Party size */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Vendégek száma *</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, party_size: Math.max(1, p.party_size - 1) }))}
              className="w-10 h-10 rounded-lg border text-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            >
              −
            </button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{form.party_size}</span>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, party_size: Math.min(maxParty, p.party_size + 1) }))}
              className="w-10 h-10 rounded-lg border text-xl font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            >
              +
            </button>
            <span className="text-sm text-gray-500">fő (max {maxParty})</span>
          </div>
        </div>

        {/* Date & time */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Dátum és időpont *</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dátum</label>
            <select
              value={form.reservation_date}
              onChange={(e) => setForm((p) => ({ ...p, reservation_date: e.target.value, reservation_time: '' }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              required
            >
              <option value="">Válassz dátumot...</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {form.reservation_date && timeSlots.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Időpont</label>
              <select
                value={form.reservation_time}
                onChange={(e) => setForm((p) => ({ ...p, reservation_time: e.target.value }))}
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

          {form.reservation_date && timeSlots.length === 0 && (
            <p className="text-sm text-amber-700">Erre a napra nincs elérhető időpont.</p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Megjegyzés</h2>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            maxLength={500}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            placeholder="Pl. allergia, különleges kérés, születésnap..."
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.notes.length}/500</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full text-white py-4 rounded-xl font-semibold text-base disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {loading ? 'Foglalás leadása...' : 'Foglalás leadása →'}
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
