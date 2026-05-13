'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BusinessConfig } from '@/types'

type Period = 'today' | '7d' | '30d' | '90d'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Ma',
  '7d': 'Utolsó 7 nap',
  '30d': 'Utolsó 30 nap',
  '90d': 'Utolsó 90 nap',
}

interface AnalyticsData {
  summary: {
    total_orders: number
    total_revenue: number
    avg_order_value: number
    total_customers: number
    new_customers: number
    repeat_customers: number
  }
  wolt_savings: {
    saved_amount: number
    equivalent_months: number
  }
  orders_by_day: Array<{ date: string; count: number; revenue: number }>
  orders_by_hour: Array<{ hour: number; count: number }>
  orders_by_type: Array<{ type: string; count: number; revenue: number }>
  orders_by_status: Array<{ status: string; count: number }>
  top_items: Array<{ menu_item_id: string; name: string; quantity_sold: number; revenue: number }>
  payment_breakdown: Array<{ payment_status: string; count: number; revenue: number }>
  reservations_summary: { total: number; confirmed: number; cancelled: number; seated: number; pending: number }
}

interface Props {
  config: BusinessConfig
}

export default function AdminAnalyticsClient({ config }: Props) {
  const [period, setPeriod] = useState<Period>('7d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const symbol = config.currency_symbol ?? 'Ft'
  const currency = config.currency ?? 'HUF'
  const primary = config.primary_color ?? '#E85D04'
  const locale = config.locale ?? 'hu'

  function fmt(amount: number) {
    if (currency === 'HUF') {
      return `${Math.round(amount).toLocaleString('hu-HU')} ${symbol}`
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100)
  }

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics?period=${p}`)
      if (!res.ok) throw new Error('Fetch failed')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Nem sikerült betölteni az adatokat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  const orderTypeLabels: Record<string, string> = {
    delivery: '🚴 Kiszállítás',
    takeaway: '🛍️ Elvitel',
    dine_in: '🍽️ Helyi',
  }
  const paymentStatusLabels: Record<string, string> = {
    paid: '✓ Fizetve',
    cash: 'Készpénz',
    pending: 'Függőben',
    failed: 'Sikertelen',
    refunded: 'Visszatérítve',
  }

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Analitika</h1>

        {/* Period selector */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchData(period)} className="text-sm font-medium underline">Újrapróbálás</button>
        </div>
      )}

      {loading ? (
        <SkeletonDashboard />
      ) : data ? (
        <>
          {/* ROW 1 — Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <StatCard label="Rendelések" value={String(data.summary.total_orders)} />
            <StatCard label="Bevétel" value={fmt(data.summary.total_revenue)} />
            <StatCard label="Átlag rendelés" value={fmt(data.summary.avg_order_value)} />
            <StatCard label="Vendégek" value={String(data.summary.total_customers)} />
            <StatCard label="Új vendég" value={String(data.summary.new_customers)} />
            <StatCard label="Visszatérő" value={String(data.summary.repeat_customers)} />
          </div>

          {/* ROW 2 — Wolt savings */}
          {data.summary.total_revenue > 0 && (
            <div
              className="rounded-xl p-5 mb-4 text-white"
              style={{ backgroundColor: primary }}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">💰</div>
                <div>
                  <p className="font-bold text-lg">
                    A TableOS használatával ~{fmt(data.wolt_savings.saved_amount)}-t spóroltál {PERIOD_LABELS[period].toLowerCase()} alatt.
                  </p>
                  <p className="opacity-80 text-sm mt-1">
                    Ez {data.wolt_savings.equivalent_months} hónap TableOS előfizetésnek felel meg.
                    (Számítás alapja: Wolt ~27%-os jutalék.)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ROW 3 — Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Orders by day */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Rendelések naponta</h3>
              {data.orders_by_day.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nincs adat erre az időszakra</p>
              ) : (
                <BarChart
                  bars={data.orders_by_day.map((d) => ({
                    label: d.date.slice(5),
                    value: d.count,
                    secondary: d.revenue,
                  }))}
                  color={primary}
                  formatSecondary={(v) => fmt(v)}
                />
              )}
            </div>

            {/* Orders by hour */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Rendelések óránként</h3>
              {data.orders_by_hour.every((h) => h.count === 0) ? (
                <p className="text-gray-400 text-sm text-center py-8">Nincs adat erre az időszakra</p>
              ) : (
                <BarChart
                  bars={data.orders_by_hour.filter((h) => h.count > 0 || (h.hour >= 8 && h.hour <= 23)).map((h) => ({
                    label: `${h.hour}h`,
                    value: h.count,
                  }))}
                  color={primary}
                />
              )}
            </div>
          </div>

          {/* ROW 4 — Top items, type, payment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Top items */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Top 10 étel</h3>
              {data.top_items.length === 0 ? (
                <p className="text-gray-400 text-sm">Nincs adat</p>
              ) : (
                <div className="space-y-2">
                  {data.top_items.map((item, i) => (
                    <div key={item.menu_item_id || item.name} className="flex items-start justify-between gap-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
                        <span className="text-gray-900 font-medium leading-tight">{item.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-gray-900">{item.quantity_sold}×</div>
                        <div className="text-gray-500 text-xs">{fmt(item.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Orders by type */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Rendelési mód</h3>
              {data.orders_by_type.length === 0 ? (
                <p className="text-gray-400 text-sm">Nincs adat</p>
              ) : (
                <div className="space-y-3">
                  {data.orders_by_type.map((t) => {
                    const pct = data.summary.total_orders > 0 ? Math.round((t.count / data.summary.total_orders) * 100) : 0
                    return (
                      <div key={t.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{orderTypeLabels[t.type] ?? t.type}</span>
                          <span className="font-semibold text-gray-900">{t.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: primary }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{fmt(t.revenue)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Payment breakdown */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Fizetési módok</h3>
              {data.payment_breakdown.length === 0 ? (
                <p className="text-gray-400 text-sm">Nincs adat</p>
              ) : (
                <div className="space-y-2">
                  {data.payment_breakdown.map((p) => (
                    <div key={p.payment_status} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{paymentStatusLabels[p.payment_status] ?? p.payment_status}</span>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{p.count}×</span>
                        <span className="text-gray-500 ml-2">{fmt(p.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ROW 5 — Reservations */}
          {data.reservations_summary.total > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Foglalások (összesített)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard label="Összesen" value={String(data.reservations_summary.total)} />
                <StatCard label="Visszaigazolva" value={String(data.reservations_summary.confirmed)} color="text-green-700" />
                <StatCard label="Beültetve" value={String(data.reservations_summary.seated)} color="text-gray-600" />
                <StatCard label="Függőben" value={String(data.reservations_summary.pending)} color="text-yellow-700" />
                <StatCard label="Lemondva" value={String(data.reservations_summary.cancelled)} color="text-red-600" />
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-gray-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <p className={`text-xl font-bold truncate ${color}`}>{value}</p>
    </div>
  )
}

interface BarData {
  label: string
  value: number
  secondary?: number
}

function BarChart({
  bars, color, formatSecondary,
}: {
  bars: BarData[]
  color: string
  formatSecondary?: (v: number) => string
}) {
  const maxValue = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="flex items-end gap-1 h-40 overflow-x-auto">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-col items-center gap-1 flex-shrink-0 group" style={{ minWidth: bars.length > 20 ? '12px' : '20px' }}>
          <div className="relative w-full flex items-end justify-center" style={{ height: '120px' }}>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max(4, (bar.value / maxValue) * 100)}%`,
                backgroundColor: color,
                opacity: 0.85,
              }}
              title={`${bar.label}: ${bar.value}${bar.secondary !== undefined && formatSecondary ? ` (${formatSecondary(bar.secondary)})` : ''}`}
            />
          </div>
          <span className="text-xs text-gray-400" style={{ fontSize: '10px' }}>{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

function SkeletonDashboard() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 h-20">
            <div className="h-3 bg-gray-200 rounded mb-2 w-2/3" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="h-20 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-white rounded-xl border" />
        <div className="h-64 bg-white rounded-xl border" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-64 bg-white rounded-xl border" />
        <div className="h-64 bg-white rounded-xl border" />
        <div className="h-64 bg-white rounded-xl border" />
      </div>
    </div>
  )
}
