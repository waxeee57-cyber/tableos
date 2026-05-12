'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Customer } from '@/types'
import { formatPrice, timeAgo } from '@/lib/format'

const FILTERS = [
  { value: 'all', label: 'Mind' },
  { value: 'vip', label: 'VIP ⭐' },
  { value: 'active', label: 'Aktív (30 nap)' },
  { value: 'dormant', label: 'Inaktív (90+ nap)' },
]

const SORTS = [
  { value: 'recent', label: 'Legutóbbi' },
  { value: 'orders', label: 'Legtöbb rendelés' },
  { value: 'spend', label: 'Legmagasabb költés' },
  { value: 'alphabetical', label: 'Névsor' },
]

interface Props {
  initialCustomers: Customer[]
  initialTotal: number
}

interface AddModalState {
  open: boolean
  loading: boolean
  error: string | null
}

const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '', city: '',
  postal_code: '', notes: '', is_vip: false,
}

export default function AdminCustomersClient({ initialCustomers, initialTotal }: Props) {
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 50))
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [loading, setLoading] = useState(false)

  const [modal, setModal] = useState<AddModalState>({ open: false, loading: false, error: null })
  const [form, setForm] = useState(EMPTY_FORM)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCustomers = useCallback(async (q: string, f: string, s: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, filter: f, sort: s, page: String(p), limit: '50' })
      const res = await fetch(`/api/admin/customers?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setCustomers(json.customers ?? [])
      setTotal(json.total ?? 0)
      setTotalPages(json.totalPages ?? 1)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchCustomers(search, filter, sort, page)
    }, search ? 300 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, filter, sort, page, fetchCustomers])

  function handleFilterChange(val: string) {
    setFilter(val)
    setPage(1)
  }

  function handleSortChange(val: string) {
    setSort(val)
    setPage(1)
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(1)
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    setModal((m) => ({ ...m, loading: true, error: null }))

    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        notes: form.notes || null,
        is_vip: form.is_vip,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setModal((m) => ({ ...m, loading: false, error: json.error ?? 'Hiba történt.' }))
      return
    }

    setModal({ open: false, loading: false, error: null })
    setForm(EMPTY_FORM)
    fetchCustomers(search, filter, sort, 1)
    setPage(1)
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-xl font-bold text-gray-900">
          Vendégek {total > 0 && <span className="text-gray-400 font-normal text-base">({total.toLocaleString('hu-HU')})</span>}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/customers/import')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Import CSV
          </button>
          <button
            onClick={() => setModal({ open: true, loading: false, error: null })}
            className="px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            + Új vendég
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Keresés név, telefon vagy email alapján..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="ml-auto text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Betöltés...</div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          {search ? 'Nincs találat a keresésre.' : 'Még nincsenek vendégek.'}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <CustomerCard key={c.id} customer={c} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Előző
          </button>
          <span>{page}. oldal / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Következő →
          </button>
        </div>
      )}

      {/* Add customer modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Új vendég</h2>
                <button
                  onClick={() => { setModal({ open: false, loading: false, error: null }); setForm(EMPTY_FORM) }}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-3">
                <Field label="Név *" required>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className={INPUT_CLS}
                    placeholder="Kovács János"
                  />
                </Field>

                <Field label="Telefonszám *" required>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    required
                    className={INPUT_CLS}
                    placeholder="+36 30 123 4567"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="janos@example.com"
                  />
                </Field>

                <Field label="Cím">
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className={INPUT_CLS}
                    placeholder="Fő u. 12"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Város">
                    <input
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className={INPUT_CLS}
                      placeholder="Budapest"
                    />
                  </Field>
                  <Field label="Irányítószám">
                    <input
                      value={form.postal_code}
                      onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                      className={INPUT_CLS}
                      placeholder="1011"
                    />
                  </Field>
                </div>

                <Field label="Megjegyzés">
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className={INPUT_CLS + ' resize-none'}
                    placeholder="Admin megjegyzés..."
                  />
                </Field>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_vip}
                    onChange={(e) => setForm((f) => ({ ...f, is_vip: e.target.checked }))}
                    className="rounded"
                  />
                  VIP vendég ⭐
                </label>

                {modal.error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{modal.error}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setModal({ open: false, loading: false, error: null }); setForm(EMPTY_FORM) }}
                    className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    disabled={modal.loading}
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                  >
                    {modal.loading ? 'Mentés...' : 'Mentés'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerCard({ customer: c }: { customer: Customer }) {
  const router = useRouter()
  const currency = 'HUF'
  const symbol = 'Ft'

  const addressLine = [c.city, c.address].filter(Boolean).join(', ')

  return (
    <div className="bg-white rounded-xl border p-4 hover:border-orange-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-gray-900 truncate">
              {c.name}
            </span>
            {c.is_vip && <span className="text-sm">⭐</span>}
          </div>
          <p className="text-sm text-gray-500 truncate">
            {c.phone}{c.email ? ` · ${c.email}` : ''}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {c.order_count} rendelés
            {' · '}
            {formatPrice(c.total_spent, currency, symbol)}
            {c.last_order_at ? ` · Utolsó: ${timeAgo(c.last_order_at)}` : ''}
          </p>
          {addressLine && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{addressLine}</p>
          )}
        </div>
        <button
          onClick={() => router.push(`/admin/customers/${c.id}`)}
          className="shrink-0 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Részletek →
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'
