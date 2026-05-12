'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/types'
import { formatPrice, timeAgo, formatDate } from '@/lib/format'

interface OrderRow {
  id: string
  order_number: string
  total: number
  status: string
  placed_at: string
  order_items?: Array<{ item_name: string; item_size: string | null; quantity: number }>
}

interface Props {
  customer: Customer
  orders: OrderRow[]
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Új',
  accepted: 'Elfogadva',
  preparing: 'Készül',
  ready: 'Kész',
  delivering: 'Kiszállítás',
  completed: 'Teljesítve',
  cancelled: 'Lemondva',
  rejected: 'Visszautasítva',
}

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'

export default function AdminCustomerDetailClient({ customer: initialCustomer, orders }: Props) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer>(initialCustomer)

  // Notes auto-save
  const [notes, setNotes] = useState(customer.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleNotesChange(val: string) {
    setNotes(val)
    setNotesSaved(false)
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    notesDebounceRef.current = setTimeout(() => saveNotes(val), 300)
  }

  async function saveNotes(val: string) {
    await fetch(`/api/admin/customers/${customer.id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: val }),
    })
    setNotesSaved(true)
  }

  // VIP toggle
  async function toggleVip() {
    const newVip = !customer.is_vip
    const res = await fetch(`/api/admin/customers/${customer.id}/vip`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_vip: newVip }),
    })
    if (res.ok) setCustomer((c) => ({ ...c, is_vip: newVip }))
  }

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    postal_code: customer.postal_code ?? '',
    notes: customer.notes ?? '',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    const res = await fetch(`/api/admin/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || null,
        address: editForm.address || null,
        city: editForm.city || null,
        postal_code: editForm.postal_code || null,
        notes: editForm.notes || null,
      }),
    })
    const json = await res.json()
    setEditLoading(false)
    if (!res.ok) {
      setEditError(json.error ?? 'Hiba történt.')
      return
    }
    setCustomer(json.customer)
    setNotes(json.customer.notes ?? '')
    setEditOpen(false)
  }

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDelete() {
    setDeleteLoading(true)
    const res = await fetch(`/api/admin/customers/${customer.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/customers')
    setDeleteLoading(false)
  }

  const avgOrder = customer.order_count > 0
    ? Math.round(customer.total_spent / customer.order_count)
    : 0

  const currency = 'HUF'
  const symbol = 'Ft'

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto pb-24 lg:pb-8">
      {/* Back */}
      <button
        onClick={() => router.push('/admin/customers')}
        className="text-sm text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1"
      >
        ← Vissza a vendégekhez
      </button>

      {/* Name + actions */}
      <div className="bg-white rounded-xl border p-5 mb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              {customer.is_vip && <span className="text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">VIP ⭐</span>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {customer.phone}{customer.email ? ` · ${customer.email}` : ''}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={toggleVip}
              className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 transition-colors"
              title={customer.is_vip ? 'VIP eltávolítása' : 'VIP hozzáadása'}
            >
              {customer.is_vip ? 'VIP ✕' : '⭐ VIP'}
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Szerkesztés
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <StatCard value={String(customer.order_count)} label="rendelés" />
        <StatCard value={formatPrice(customer.total_spent, currency, symbol)} label="összesen" />
        <StatCard value={customer.order_count > 0 ? formatPrice(avgOrder, currency, symbol) : '—'} label="átlag" />
        <StatCard value={customer.last_order_at ? timeAgo(customer.last_order_at) : 'Soha'} label="utolsó" />
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl border p-4 mb-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Szállítási adatok</h2>
        <dl className="space-y-1 text-sm text-gray-600">
          {(customer.address || customer.city) && (
            <Row label="Cím" value={[customer.city, customer.address].filter(Boolean).join(', ')} />
          )}
          {customer.postal_code && <Row label="Irányítószám" value={customer.postal_code} />}
          {customer.preferred_payment_method && (
            <Row label="Kedvelt fizetés" value={customer.preferred_payment_method} />
          )}
          {!customer.address && !customer.city && !customer.postal_code && !customer.preferred_payment_method && (
            <p className="text-gray-400">Nincs adat</p>
          )}
        </dl>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Admin megjegyzések</h2>
          {notesSaved && <span className="text-xs text-green-600">Mentve ✓</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
          placeholder="Pl. Mindig extra sajtot kér..."
          maxLength={2000}
        />
      </div>

      {/* Order history */}
      <div className="bg-white rounded-xl border p-4 mb-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Rendelési előzmények</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400">Nincs rendelési előzmény.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">#{o.order_number}</span>
                  <span className="text-xs text-gray-400">{formatDate(o.placed_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-0.5">
                  <span className="text-gray-500">
                    {formatPrice(o.total, currency, symbol)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    o.status === 'completed' ? 'bg-green-100 text-green-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                {o.order_items && o.order_items.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {o.order_items.map((i) =>
                      `${i.quantity}× ${i.item_name}${i.item_size ? ` ${i.item_size}` : ''}`
                    ).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => setDeleteOpen(true)}
        className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-colors"
      >
        Vendég törlése
      </button>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Szerkesztés</h2>
                <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
              </div>
              <form onSubmit={handleEditSave} className="space-y-3">
                <EditField label="Név *">
                  <input value={editForm.name} required onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={INPUT_CLS} />
                </EditField>
                <EditField label="Telefon *">
                  <input value={editForm.phone} required onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT_CLS} />
                </EditField>
                <EditField label="Email">
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={INPUT_CLS} />
                </EditField>
                <EditField label="Cím">
                  <input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className={INPUT_CLS} />
                </EditField>
                <div className="grid grid-cols-2 gap-2">
                  <EditField label="Város">
                    <input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} className={INPUT_CLS} />
                  </EditField>
                  <EditField label="Irányítószám">
                    <input value={editForm.postal_code} onChange={(e) => setEditForm((f) => ({ ...f, postal_code: e.target.value }))} className={INPUT_CLS} />
                  </EditField>
                </div>
                <EditField label="Megjegyzés">
                  <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={INPUT_CLS + ' resize-none'} />
                </EditField>
                {editError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{editError}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setEditOpen(false)} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">Mégse</button>
                  <button type="submit" disabled={editLoading} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                    {editLoading ? 'Mentés...' : 'Mentés'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-2">Biztos vagy benne?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Ez nem visszafordítható. A rendelési előzmények megmaradnak, de a vendég törlődik.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">Mégse</button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoading ? 'Törlés...' : 'Törlés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl border p-3 text-center">
      <p className="font-bold text-gray-900 text-sm">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-gray-400 w-28 shrink-0">{label}:</dt>
      <dd className="text-gray-700">{value}</dd>
    </div>
  )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
