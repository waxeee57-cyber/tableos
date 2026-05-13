'use client'

import { useState } from 'react'
import type { BusinessConfig, DeliveryZone } from '@/types'
import { formatPrice } from '@/lib/format'

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Hétfő' },
  { key: 'tue', label: 'Kedd' },
  { key: 'wed', label: 'Szerda' },
  { key: 'thu', label: 'Csütörtök' },
  { key: 'fri', label: 'Péntek' },
  { key: 'sat', label: 'Szombat' },
  { key: 'sun', label: 'Vasárnap' },
]

interface Props {
  initialConfig: BusinessConfig
  initialZones: DeliveryZone[]
}

export default function AdminSettingsClient({ initialConfig, initialZones }: Props) {
  const [config, setConfig] = useState(initialConfig)
  const [zones] = useState(initialZones)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  function set<K extends keyof BusinessConfig>(k: K, v: BusinessConfig[K]) {
    setConfig((p) => ({ ...p, [k]: v }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const currency = config.currency ?? 'HUF'
  const symbol = config.currency_symbol ?? 'Ft'

  return (
    <div className="p-6 max-w-3xl mx-auto pb-20 lg:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Beállítások</h1>
        <button
          onClick={save}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
        >
          {saving ? 'Mentés...' : saved ? '✓ Mentve' : 'Mentés'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-2 mb-6">
        {[
          { key: 'info', label: 'Étterem adatai' },
          { key: 'hours', label: 'Nyitvatartás' },
          { key: 'orders', label: 'Rendelések' },
          { key: 'payments', label: 'Fizetés' },
          { key: 'zones', label: 'Kiszállítási zónák' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-colors ${
              activeTab === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <Field label="Étterem neve" value={config.business_name} onChange={(v) => set('business_name', v)} />
          <Field label="Tagline" value={config.tagline ?? ''} onChange={(v) => set('tagline', v)} />
          <Field label="Telefonszám" value={config.phone ?? ''} onChange={(v) => set('phone', v)} />
          <Field label="E-mail" value={config.email ?? ''} onChange={(v) => set('email', v)} type="email" />
          <Field label="Cím" value={config.address ?? ''} onChange={(v) => set('address', v)} />
          <Field label="Város" value={config.city ?? ''} onChange={(v) => set('city', v)} />
          <Field label="Akcentszín (hex)" value={config.primary_color ?? '#E85D04'} onChange={(v) => set('primary_color', v)} />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Előnézet:</span>
            <div
              className="w-8 h-8 rounded-full border"
              style={{ backgroundColor: config.primary_color ?? '#E85D04' }}
            />
          </div>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="bg-white rounded-xl border p-6 space-y-3">
          {DAYS.map(({ key, label }) => {
            const dayHours = (config.operating_hours ?? {})[key]
            const open = dayHours !== null && dayHours !== undefined
            return (
              <div key={key} className="flex items-center gap-4 flex-wrap">
                <span className="w-20 text-sm font-medium text-gray-700">{label}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={open}
                    onChange={(e) => set('operating_hours', {
                      ...config.operating_hours,
                      [key]: e.target.checked ? { open: '11:00', close: '20:00' } : null,
                    })}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-600">Nyitva</span>
                </label>
                {open && (
                  <>
                    <input
                      type="time"
                      value={dayHours?.open ?? '11:00'}
                      onChange={(e) => set('operating_hours', {
                        ...config.operating_hours,
                        [key]: { ...dayHours, open: e.target.value },
                      })}
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">—</span>
                    <input
                      type="time"
                      value={dayHours?.close ?? '20:00'}
                      onChange={(e) => set('operating_hours', {
                        ...config.operating_hours,
                        [key]: { ...dayHours, close: e.target.value },
                      })}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </>
                )}
                {!open && <span className="text-sm text-gray-400">Zárva</span>}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Rendelési módok</h3>
            <Toggle label="Kiszállítás" checked={config.delivery_enabled} onChange={(v) => set('delivery_enabled', v)} />
            <Toggle label="Elvitel" checked={config.takeaway_enabled} onChange={(v) => set('takeaway_enabled', v)} />
            <Toggle label="Helyi fogyasztás" checked={config.dine_in_enabled} onChange={(v) => set('dine_in_enabled', v)} />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-gray-900">Kiszállítás</h3>
            <Field
              label="Minimum rendelési összeg kiszállításhoz (Ft)"
              type="number"
              value={String(config.min_order_amount ?? 0)}
              onChange={(v) => set('min_order_amount', parseInt(v) || 0)}
            />
            <Field
              label="Kiszállítási díj (Ft)"
              type="number"
              value={String(config.delivery_fee ?? 0)}
              onChange={(v) => set('delivery_fee', parseInt(v) || 0)}
            />
            <Field
              label="Ingyenes kiszállítástól (Ft, 0 = mindig fizet)"
              type="number"
              value={String(config.delivery_fee_threshold ?? 0)}
              onChange={(v) => set('delivery_fee_threshold', parseInt(v) || 0)}
            />
            <Field
              label="Becsült kiszállítási idő (perc)"
              type="number"
              value={String(config.estimated_delivery_minutes ?? 45)}
              onChange={(v) => set('estimated_delivery_minutes', parseInt(v) || 45)}
            />
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Fizetési módok</h3>
            <Toggle
              label="Kiszállításhoz készpénz engedélyezése"
              checked={config.cash_on_delivery_enabled ?? true}
              onChange={(v) => set('cash_on_delivery_enabled', v)}
            />
            <Toggle
              label="Elvitelhez készpénz engedélyezése"
              checked={config.cash_on_pickup_enabled ?? true}
              onChange={(v) => set('cash_on_pickup_enabled', v)}
            />
            <Toggle
              label="Online kártyafizetés (Stripe)"
              checked={config.online_payment_enabled ?? false}
              onChange={(v) => set('online_payment_enabled', v)}
            />
            {config.online_payment_enabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                Az online kártyafizetés aktiválásához lépj kapcsolatba a Domrol supporttal — a Stripe konfigurációt mi végezzük el 24 órán belül.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'zones' && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Kiszállítási zónák</h3>
          </div>
          {zones.length === 0 ? (
            <p className="text-gray-400 text-sm">Nincsenek kiszállítási zónák konfigurálva. Az étterem alap kiszállítási díja kerül alkalmazásra.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-500">Terület neve</th>
                    <th className="text-left py-2 font-medium text-gray-500">Települések</th>
                    <th className="text-right py-2 font-medium text-gray-500">Díj</th>
                    <th className="text-right py-2 font-medium text-gray-500">Min. összeg</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => (
                    <tr key={zone.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-gray-900">{zone.name}</td>
                      <td className="py-2 text-gray-600 max-w-[200px] truncate">{zone.areas}</td>
                      <td className="py-2 text-right text-gray-900">{formatPrice(zone.delivery_fee, currency, symbol)}</td>
                      <td className="py-2 text-right text-gray-600">{formatPrice(zone.min_order_amount, currency, symbol)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-orange-500' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
