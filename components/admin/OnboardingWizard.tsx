'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessConfig, MenuCategory, MenuItem } from '@/types'
import { createClient } from '@/lib/supabase/client'

const TOTAL_STEPS = 6

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Hétfő' },
  { key: 'tue', label: 'Kedd' },
  { key: 'wed', label: 'Szerda' },
  { key: 'thu', label: 'Csütörtök' },
  { key: 'fri', label: 'Péntek' },
  { key: 'sat', label: 'Szombat' },
  { key: 'sun', label: 'Vasárnap' },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now()
}

interface Props {
  initialConfig: BusinessConfig
}

export default function OnboardingWizard({ initialConfig }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(initialConfig.onboarding_step > 0 ? Math.min(initialConfig.onboarding_step, TOTAL_STEPS - 1) : 0)
  const [config, setConfig] = useState(initialConfig)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof BusinessConfig>(k: K, v: BusinessConfig[K]) {
    setConfig((p) => ({ ...p, [k]: v }))
  }

  async function saveSettings(patch: Partial<BusinessConfig>) {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error('Mentés sikertelen')
    const data = await res.json()
    return data.config
  }

  async function goNext(patch: Partial<BusinessConfig>) {
    setSaving(true)
    setError(null)
    try {
      const nextStep = step + 1
      await saveSettings({ ...patch, onboarding_step: nextStep })
      setConfig((p) => ({ ...p, ...patch, onboarding_step: nextStep }))
      setStep(nextStep)
    } catch {
      setError('Hiba a mentés során. Próbáld újra.')
    } finally {
      setSaving(false)
    }
  }

  async function goLive(checklist: ChecklistItem[]) {
    if (checklist.some((c) => !c.ok)) return
    setSaving(true)
    setError(null)
    try {
      await saveSettings({ onboarding_completed: true, onboarding_step: 6 })
      router.push('/admin')
    } catch {
      setError('Hiba az aktiválás során. Próbáld újra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Üdvözöl a TableOS!</h1>
          <p className="text-gray-500">Néhány lépés és kész is az éttermed.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{step + 1}. lépés a {TOTAL_STEPS}-ból</span>
            <span className="text-sm text-gray-500">{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-orange-500 text-white'
                  : i === step ? 'bg-orange-500 text-white ring-2 ring-orange-200'
                  : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {step === 0 && (
          <Step1Basics config={config} setField={setField} saving={saving} onNext={goNext} />
        )}
        {step === 1 && (
          <Step2Hours config={config} setField={setField} saving={saving} onNext={goNext} />
        )}
        {step === 2 && (
          <Step3Orders config={config} setField={setField} saving={saving} onNext={goNext} />
        )}
        {step === 3 && (
          <Step4Menu saving={saving} onNext={() => goNext({})} />
        )}
        {step === 4 && (
          <Step5Payments config={config} setField={setField} saving={saving} onNext={goNext} />
        )}
        {step === 5 && (
          <Step6GoLive config={config} saving={saving} onGoLive={goLive} />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 1 — Restaurant basics
// ──────────────────────────────────────────────────────────────────────────────

function Step1Basics({
  config, setField, saving, onNext,
}: {
  config: BusinessConfig
  setField: <K extends keyof BusinessConfig>(k: K, v: BusinessConfig[K]) => void
  saving: boolean
  onNext: (p: Partial<BusinessConfig>) => Promise<void>
}) {
  const [form, setForm] = useState({
    business_name: config.business_name,
    tagline: config.tagline ?? '',
    phone: config.phone ?? '',
    email: config.email ?? '',
    address: config.address ?? '',
    city: config.city ?? '',
  })

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!form.business_name.trim()) return
    if (!form.phone.trim()) return
    if (!form.email.trim()) return
    await onNext({
      business_name: form.business_name,
      tagline: form.tagline || null,
      phone: form.phone,
      email: form.email,
      address: form.address || null,
      city: form.city || null,
    })
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Étterem adatai</h2>
      <p className="text-sm text-gray-500 mb-6">Az alapinformációk, amik megjelennek az étlapon.</p>
      <form onSubmit={handleNext} className="space-y-4">
        <Field label="Étterem neve *" value={form.business_name} onChange={(v) => set('business_name', v)} placeholder="pl. Zöldfészek" required />
        <Field label="Tagline" value={form.tagline} onChange={(v) => set('tagline', v)} placeholder="pl. Friss ételek, gyors kiszállítás" />
        <Field label="Telefonszám *" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+36 30 123 4567" type="tel" required />
        <Field label="E-mail *" value={form.email} onChange={(v) => set('email', v)} placeholder="info@etterem.hu" type="email" required />
        <Field label="Cím" value={form.address} onChange={(v) => set('address', v)} placeholder="Kossuth utca 12." />
        <Field label="Város" value={form.city} onChange={(v) => set('city', v)} placeholder="Budapest" />
        <NextButton loading={saving} />
      </form>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 2 — Opening hours
// ──────────────────────────────────────────────────────────────────────────────

function Step2Hours({
  config, setField, saving, onNext,
}: {
  config: BusinessConfig
  setField: <K extends keyof BusinessConfig>(k: K, v: BusinessConfig[K]) => void
  saving: boolean
  onNext: (p: Partial<BusinessConfig>) => Promise<void>
}) {
  const [hours, setHours] = useState(config.operating_hours ?? {})

  function setDay(key: string, val: { open: string; close: string } | null) {
    setHours((p) => ({ ...p, [key]: val }))
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    await onNext({ operating_hours: hours })
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Nyitvatartás</h2>
      <p className="text-sm text-gray-500 mb-6">Mikor fogad rendeléseket az éttermed?</p>
      <form onSubmit={handleNext} className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const dayHours = hours[key]
          const open = dayHours !== null && dayHours !== undefined
          return (
            <div key={key} className="flex items-center gap-4 flex-wrap">
              <span className="w-20 text-sm font-medium text-gray-700">{label}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={open}
                  onChange={(e) => setDay(key, e.target.checked ? { open: '11:00', close: '20:00' } : null)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-600">Nyitva</span>
              </label>
              {open && (
                <>
                  <input
                    type="time"
                    value={dayHours?.open ?? '11:00'}
                    onChange={(e) => setDay(key, { ...dayHours!, open: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400">—</span>
                  <input
                    type="time"
                    value={dayHours?.close ?? '20:00'}
                    onChange={(e) => setDay(key, { ...dayHours!, close: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </>
              )}
              {!open && <span className="text-sm text-gray-400">Zárva</span>}
            </div>
          )
        })}
        <div className="pt-4">
          <NextButton loading={saving} />
        </div>
      </form>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 3 — Order types
// ──────────────────────────────────────────────────────────────────────────────

function Step3Orders({
  config, setField, saving, onNext,
}: {
  config: BusinessConfig
  setField: <K extends keyof BusinessConfig>(k: K, v: BusinessConfig[K]) => void
  saving: boolean
  onNext: (p: Partial<BusinessConfig>) => Promise<void>
}) {
  const [form, setForm] = useState({
    delivery_enabled: config.delivery_enabled,
    takeaway_enabled: config.takeaway_enabled,
    dine_in_enabled: config.dine_in_enabled,
    delivery_fee: config.delivery_fee,
    delivery_fee_threshold: config.delivery_fee_threshold,
    min_order_amount: config.min_order_amount,
    estimated_delivery_minutes: config.estimated_delivery_minutes,
    delivery_radius_km: config.delivery_radius_km,
    scheduling_enabled: config.scheduling_enabled,
    scheduling_days_ahead: config.scheduling_days_ahead,
    scheduling_slot_minutes: config.scheduling_slot_minutes,
  })

  function toggle(k: keyof typeof form) {
    setForm((p) => ({ ...p, [k]: !p[k] }))
  }
  function num(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: parseInt(v) || 0 }))
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    await onNext(form as Partial<BusinessConfig>)
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Rendelési módok</h2>
      <p className="text-sm text-gray-500 mb-6">Hogyan tud rendelni a vendég?</p>
      <form onSubmit={handleNext} className="space-y-6">
        <div className="space-y-3">
          <Toggle label="Kiszállítás" checked={form.delivery_enabled} onChange={() => toggle('delivery_enabled')} />
          <Toggle label="Elvitel" checked={form.takeaway_enabled} onChange={() => toggle('takeaway_enabled')} />
          <Toggle label="Helyi fogyasztás (dine-in)" checked={form.dine_in_enabled} onChange={() => toggle('dine_in_enabled')} />
        </div>

        {form.delivery_enabled && (
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm text-gray-700">Kiszállítás részletei</h3>
            <Field label="Kiszállítási díj (Ft)" type="number" value={String(form.delivery_fee)} onChange={(v) => num('delivery_fee', v)} />
            <Field label="Ingyenes kiszállítástól (Ft)" type="number" value={String(form.delivery_fee_threshold)} onChange={(v) => num('delivery_fee_threshold', v)} />
            <Field label="Min. rendelési összeg (Ft)" type="number" value={String(form.min_order_amount)} onChange={(v) => num('min_order_amount', v)} />
            <Field label="Becsült kiszállítási idő (perc)" type="number" value={String(form.estimated_delivery_minutes)} onChange={(v) => num('estimated_delivery_minutes', v)} />
            <Field label="Kiszállítási körzet (km)" type="number" value={String(form.delivery_radius_km)} onChange={(v) => num('delivery_radius_km', v)} />
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          <Toggle label="Előrendelés (ütemezett rendelés)" checked={form.scheduling_enabled} onChange={() => toggle('scheduling_enabled')} />
          {form.scheduling_enabled && (
            <>
              <Field label="Hány napra előre (alapértelmezett: 7)" type="number" value={String(form.scheduling_days_ahead)} onChange={(v) => num('scheduling_days_ahead', v)} />
              <Field label="Időrés (perc, alapértelmezett: 30)" type="number" value={String(form.scheduling_slot_minutes)} onChange={(v) => num('scheduling_slot_minutes', v)} />
            </>
          )}
        </div>

        <NextButton loading={saving} />
      </form>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 4 — Menu setup
// ──────────────────────────────────────────────────────────────────────────────

function Step4Menu({ saving, onNext }: { saving: boolean; onNext: () => Promise<void> }) {
  const db = createClient()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [catName, setCatName] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [selectedCatId, setSelectedCatId] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)

  const loadMenu = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      db.from('menu_categories').select('*').order('sort_order'),
      db.from('menu_items').select('*').order('sort_order'),
    ])
    setCategories((catRes.data ?? []) as MenuCategory[])
    setItems((itemRes.data ?? []) as MenuItem[])
    if (catRes.data && catRes.data.length > 0 && !selectedCatId) {
      setSelectedCatId(catRes.data[0].id)
    }
    setLoaded(true)
  }, [db, selectedCatId])

  if (!loaded) {
    loadMenu()
  }

  async function addCategory() {
    if (!catName.trim()) return
    setBusy(true)
    const { data } = await db.from('menu_categories').insert({
      name: catName.trim(),
      slug: slugify(catName.trim()),
      description: catDesc.trim() || null,
      sort_order: categories.length,
      is_visible: true,
    }).select('*').single()
    if (data) {
      const newCat = data as MenuCategory
      setCategories((p) => [...p, newCat])
      setSelectedCatId(newCat.id)
    }
    setCatName('')
    setCatDesc('')
    setBusy(false)
  }

  async function addItem() {
    if (!itemName.trim() || !selectedCatId || !itemPrice) return
    const price = parseInt(itemPrice) || 0
    if (price <= 0) return
    setBusy(true)
    const { data } = await db.from('menu_items').insert({
      category_id: selectedCatId,
      name: itemName.trim(),
      slug: slugify(itemName.trim()),
      description: itemDesc.trim() || null,
      prices: [{ size: null, price }],
      allergens: [],
      is_available: true,
      is_visible: true,
      sort_order: items.filter((i) => i.category_id === selectedCatId).length,
    }).select('*').single()
    if (data) setItems((p) => [...p, data as MenuItem])
    setItemName('')
    setItemDesc('')
    setItemPrice('')
    setBusy(false)
  }

  const hasMinimum = categories.length > 0 && items.some((i) => i.is_available)
  const catItems = items.filter((i) => i.category_id === selectedCatId)

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!hasMinimum) {
      setMenuError('Adj hozzá legalább 1 kategóriát és 1 ételt a folytatáshoz.')
      return
    }
    await onNext()
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Étlap beállítása</h2>
      <p className="text-sm text-gray-500 mb-6">Adj hozzá kategóriákat és ételeket. Minimum 1 kategória és 1 étel szükséges.</p>

      {/* Add category */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Új kategória</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="pl. Pizzák"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={busy || !catName.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            + Hozzáad
          </button>
        </div>
      </div>

      {/* Category list */}
      {categories.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap mb-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCatId === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cat.name} ({items.filter((i) => i.category_id === cat.id).length})
              </button>
            ))}
          </div>

          {/* Add item to selected category */}
          {selectedCatId && (
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700">Étel hozzáadása</h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Étel neve"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="Ár (Ft)"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Leírás (opcionális)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                <button
                  type="button"
                  onClick={addItem}
                  disabled={busy || !itemName.trim() || !itemPrice}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  + Hozzáad
                </button>
              </div>

              {/* Category items */}
              {catItems.length > 0 && (
                <div className="space-y-1 mt-2">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <span className="text-gray-900">{item.name}</span>
                      <span className="text-gray-500">{item.prices[0]?.price ?? 0} Ft</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {menuError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {menuError}
        </div>
      )}

      <form onSubmit={handleNext}>
        <button
          type="submit"
          disabled={saving || !hasMinimum}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-base hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Mentés...' : !hasMinimum ? 'Adj hozzá legalább 1 ételt a folytatáshoz' : 'Folytatás →'}
        </button>
      </form>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 5 — Payments
// ──────────────────────────────────────────────────────────────────────────────

function Step5Payments({
  config, setField, saving, onNext,
}: {
  config: BusinessConfig
  setField: <K extends keyof BusinessConfig>(k: K, v: BusinessConfig[K]) => void
  saving: boolean
  onNext: (p: Partial<BusinessConfig>) => Promise<void>
}) {
  const [form, setForm] = useState({
    cash_on_delivery_enabled: config.cash_on_delivery_enabled,
    cash_on_pickup_enabled: config.cash_on_pickup_enabled,
    online_payment_enabled: config.online_payment_enabled,
  })

  function toggle(k: keyof typeof form) {
    setForm((p) => ({ ...p, [k]: !p[k] }))
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    await onNext(form as Partial<BusinessConfig>)
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Fizetési módok</h2>
      <p className="text-sm text-gray-500 mb-6">Hogyan fizethetnek a vendégek?</p>
      <form onSubmit={handleNext} className="space-y-4">
        <Toggle label="Kiszállításhoz készpénz" checked={form.cash_on_delivery_enabled} onChange={() => toggle('cash_on_delivery_enabled')} />
        <Toggle label="Elvitelhez készpénz" checked={form.cash_on_pickup_enabled} onChange={() => toggle('cash_on_pickup_enabled')} />
        <Toggle label="Online kártyafizetés (Stripe)" checked={form.online_payment_enabled} onChange={() => toggle('online_payment_enabled')} />
        {form.online_payment_enabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            Az online kártyafizetés elérhető. Lépj kapcsolatba a Domrol supporttal az aktiváláshoz — a Stripe konfigurációt mi végezzük el 24 órán belül.
          </div>
        )}
        <div className="pt-2">
          <NextButton loading={saving} />
        </div>
      </form>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 6 — Go live checklist
// ──────────────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  label: string
  ok: boolean
}

function Step6GoLive({
  config, saving, onGoLive,
}: {
  config: BusinessConfig
  saving: boolean
  onGoLive: (checklist: ChecklistItem[]) => Promise<void>
}) {
  const checklist: ChecklistItem[] = [
    { label: 'Étterem neve beállítva', ok: !!config.business_name && config.business_name !== 'My Restaurant' },
    { label: 'Nyitvatartás beállítva (legalább 1 nap)', ok: Object.values(config.operating_hours).some(Boolean) },
    { label: 'Legalább 1 rendelési mód engedélyezve', ok: config.delivery_enabled || config.takeaway_enabled || config.dine_in_enabled },
    { label: 'Telefonszám megadva', ok: !!config.phone },
    { label: 'E-mail megadva', ok: !!config.email },
  ]

  const allOk = checklist.every((c) => c.ok)

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Aktiválási ellenőrzőlista</h2>
      <p className="text-sm text-gray-500 mb-6">Minden zöld? Akkor élesítheted az éttermedet!</p>

      <div className="space-y-3 mb-8">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              item.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {item.ok ? '✓' : '✗'}
            </div>
            <span className={`text-sm ${item.ok ? 'text-gray-900' : 'text-red-600'}`}>{item.label}</span>
          </div>
        ))}
      </div>

      {!allOk && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
          Töltsd ki a hiányzó adatokat a korábbi lépésekben, majd gyere vissza.
        </div>
      )}

      <button
        onClick={() => onGoLive(checklist)}
        disabled={!allOk || saving}
        className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-base hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Aktiválás...' : '🚀 Élesítés!'}
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared UI helpers
// ──────────────────────────────────────────────────────────────────────────────

function NextButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-base hover:bg-orange-600 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Mentés...' : 'Folytatás →'}
    </button>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text', required = false,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
      />
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={onChange}
        className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-orange-500' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
