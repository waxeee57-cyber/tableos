'use client'

import { useState } from 'react'
import type { Reservation } from '@/types'

interface Props {
  initialReservations: Reservation[]
}

type DateFilter = 'today' | 'week' | 'upcoming' | 'past'
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'seated'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Visszaigazolásra vár',
  confirmed: 'Visszaigazolva',
  cancelled: 'Lemondva',
  seated: 'Beültetve',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  seated: 'bg-gray-100 text-gray-700',
}

function todayStr(): string {
  return new Date().toISOString().substring(0, 10)
}

function endOfWeekStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().substring(0, 10)
}

export default function AdminReservationsClient({ initialReservations }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
  const [dateFilter, setDateFilter] = useState<DateFilter>('upcoming')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const today = todayStr()
  const weekEnd = endOfWeekStr()

  const filtered = reservations.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter

    let matchesDate = true
    if (dateFilter === 'today') matchesDate = r.reservation_date === today
    else if (dateFilter === 'week') matchesDate = r.reservation_date >= today && r.reservation_date <= weekEnd
    else if (dateFilter === 'upcoming') matchesDate = r.reservation_date >= today
    else if (dateFilter === 'past') matchesDate = r.reservation_date < today

    return matchesStatus && matchesDate
  })

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'seated') {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/reservations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const { reservation } = await res.json()
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? (reservation as Reservation) : r))
        )
      }
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Foglalások</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {([
            { key: 'today', label: 'Ma' },
            { key: 'week', label: 'Héten' },
            { key: 'upcoming', label: 'Közelgő' },
            { key: 'past', label: 'Elmúlt' },
          ] as { key: DateFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                dateFilter === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {([
            { key: 'all', label: 'Mind' },
            { key: 'pending', label: 'Várakozó' },
            { key: 'confirmed', label: 'Visszaigazolt' },
            { key: 'cancelled', label: 'Lemondott' },
            { key: 'seated', label: 'Beültetett' },
          ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === key ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          Nincs foglalás ebben a kategóriában
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              updating={updating === r.id}
              onAction={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReservationCard({
  reservation: r,
  updating,
  onAction,
}: {
  reservation: Reservation
  updating: boolean
  onAction: (id: string, status: 'confirmed' | 'cancelled' | 'seated') => void
}) {
  const time = r.reservation_time.substring(0, 5)

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <span className="font-bold text-gray-900">{r.reservation_date}</span>
            <span className="ml-2 text-gray-500">{time}</span>
          </div>
          <span className="text-sm text-gray-600">{r.party_size} fő</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[r.status] ?? r.status}
        </span>
      </div>

      <div className="mt-2 text-sm text-gray-700">
        <span className="font-medium">{r.customer_name}</span>
        {' · '}
        <a href={`tel:${r.customer_phone}`} className="text-blue-600 hover:underline">{r.customer_phone}</a>
        {r.customer_email && (
          <span className="text-gray-500"> · {r.customer_email}</span>
        )}
      </div>

      {r.notes && (
        <p className="mt-1 text-sm text-amber-700 bg-amber-50 rounded px-2 py-1 truncate" title={r.notes}>
          💬 {r.notes}
        </p>
      )}

      <div className="mt-3 flex gap-2 flex-wrap">
        {r.status === 'pending' && (
          <>
            <ActionButton
              label="✓ Visszaigazol"
              onClick={() => onAction(r.id, 'confirmed')}
              disabled={updating}
              variant="primary"
            />
            <ActionButton
              label="✕ Lemond"
              onClick={() => onAction(r.id, 'cancelled')}
              disabled={updating}
              variant="danger"
            />
          </>
        )}
        {r.status === 'confirmed' && (
          <>
            <ActionButton
              label="→ Beültet"
              onClick={() => onAction(r.id, 'seated')}
              disabled={updating}
              variant="primary"
            />
            <ActionButton
              label="✕ Lemond"
              onClick={() => onAction(r.id, 'cancelled')}
              disabled={updating}
              variant="danger"
            />
          </>
        )}
      </div>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  variant: 'primary' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60 ${
        variant === 'primary'
          ? 'bg-orange-500 text-white hover:bg-orange-600'
          : 'bg-red-50 text-red-600 hover:bg-red-100'
      }`}
    >
      {disabled ? '...' : label}
    </button>
  )
}
