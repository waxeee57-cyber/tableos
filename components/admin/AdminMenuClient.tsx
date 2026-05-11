'use client'

import { useState } from 'react'
import type { MenuCategory, MenuItem, PriceOption } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/format'
import { ALLERGENS } from '@/lib/constants'
import Link from 'next/link'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now()
}

interface Props {
  initialCategories: MenuCategory[]
  initialItems: MenuItem[]
}

export default function AdminMenuClient({ initialCategories, initialItems }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [items, setItems] = useState(initialItems)
  const [selectedCatId, setSelectedCatId] = useState(initialCategories[0]?.id ?? '')
  const [catModal, setCatModal] = useState<Partial<MenuCategory> | null>(null)
  const [itemModal, setItemModal] = useState<Partial<MenuItem> | null>(null)
  const [saving, setSaving] = useState(false)

  const db = createClient()

  async function saveCategory() {
    if (!catModal) return
    setSaving(true)
    try {
      if (catModal.id) {
        const { data } = await db.from('menu_categories').update({
          name: catModal.name,
          name_en: catModal.name_en ?? null,
          description: catModal.description ?? null,
          sort_order: catModal.sort_order ?? 0,
          is_visible: catModal.is_visible ?? true,
          updated_at: new Date().toISOString(),
        }).eq('id', catModal.id).select('*').single()
        if (data) setCategories((prev) => prev.map((c) => c.id === data.id ? data as MenuCategory : c))
      } else {
        const { data } = await db.from('menu_categories').insert({
          name: catModal.name ?? '',
          slug: slugify(catModal.name ?? 'kategoria'),
          name_en: catModal.name_en ?? null,
          description: catModal.description ?? null,
          sort_order: catModal.sort_order ?? 0,
          is_visible: catModal.is_visible ?? true,
        }).select('*').single()
        if (data) setCategories((prev) => [...prev, data as MenuCategory])
      }
      setCatModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function toggleCategoryVisible(cat: MenuCategory) {
    const { data } = await db.from('menu_categories')
      .update({ is_visible: !cat.is_visible })
      .eq('id', cat.id).select('*').single()
    if (data) setCategories((prev) => prev.map((c) => c.id === data.id ? data as MenuCategory : c))
  }

  async function saveItem() {
    if (!itemModal) return
    setSaving(true)
    try {
      const prices: PriceOption[] = (itemModal.prices ?? [{ size: null, price: 0 }])
      if (itemModal.id) {
        const { data } = await db.from('menu_items').update({
          category_id: itemModal.category_id ?? null,
          name: itemModal.name,
          name_en: itemModal.name_en ?? null,
          description: itemModal.description ?? null,
          description_en: itemModal.description_en ?? null,
          prices,
          allergens: itemModal.allergens ?? [],
          is_vegetarian: itemModal.is_vegetarian ?? false,
          is_vegan: itemModal.is_vegan ?? false,
          is_spicy: itemModal.is_spicy ?? false,
          is_new: itemModal.is_new ?? false,
          is_popular: itemModal.is_popular ?? false,
          is_available: itemModal.is_available ?? true,
          is_visible: itemModal.is_visible ?? true,
          prep_time_minutes: itemModal.prep_time_minutes ?? 15,
          sort_order: itemModal.sort_order ?? 0,
          updated_at: new Date().toISOString(),
        }).eq('id', itemModal.id).select('*').single()
        if (data) setItems((prev) => prev.map((i) => i.id === data.id ? data as MenuItem : i))
      } else {
        const { data } = await db.from('menu_items').insert({
          category_id: itemModal.category_id ?? selectedCatId,
          name: itemModal.name ?? '',
          slug: slugify(itemModal.name ?? 'etel'),
          name_en: itemModal.name_en ?? null,
          description: itemModal.description ?? null,
          description_en: itemModal.description_en ?? null,
          prices,
          allergens: itemModal.allergens ?? [],
          is_vegetarian: itemModal.is_vegetarian ?? false,
          is_vegan: itemModal.is_vegan ?? false,
          is_spicy: itemModal.is_spicy ?? false,
          is_new: itemModal.is_new ?? false,
          is_popular: itemModal.is_popular ?? false,
          is_available: itemModal.is_available ?? true,
          is_visible: itemModal.is_visible ?? true,
          prep_time_minutes: itemModal.prep_time_minutes ?? 15,
        }).select('*').single()
        if (data) setItems((prev) => [...prev, data as MenuItem])
      }
      setItemModal(null)
    } finally {
      setSaving(false)
    }
  }

  async function toggleItemAvailable(item: MenuItem) {
    const { data } = await db.from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id).select('*').single()
    if (data) setItems((prev) => prev.map((i) => i.id === data.id ? data as MenuItem : i))
  }

  const selectedCategoryItems = items.filter((i) => i.category_id === selectedCatId)

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen pb-16 lg:pb-0">
      {/* Left panel: categories */}
      <div className="lg:w-80 border-b lg:border-b-0 lg:border-r bg-white p-4 space-y-2 lg:overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Kategóriák</h2>
          <Link href="/admin/menu/import" className="text-xs text-blue-600 hover:underline">CSV import</Link>
        </div>

        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
              selectedCatId === cat.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            <div>
              <p className="font-medium text-sm text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-400">{items.filter((i) => i.category_id === cat.id).length} tétel</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleCategoryVisible(cat) }}
                className={`text-xs px-2 py-0.5 rounded ${cat.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {cat.is_visible ? 'Látható' : 'Rejtett'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCatModal(cat) }}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                ✎
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => setCatModal({ name: '', is_visible: true, sort_order: categories.length })}
          className="w-full mt-2 border-2 border-dashed border-gray-200 rounded-lg p-3 text-sm text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
        >
          + Kategória hozzáadása
        </button>
      </div>

      {/* Right panel: items */}
      <div className="flex-1 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">
            {categories.find((c) => c.id === selectedCatId)?.name ?? 'Tételek'}
            <span className="ml-2 text-sm font-normal text-gray-500">({selectedCategoryItems.length})</span>
          </h2>
          <button
            onClick={() => setItemModal({ category_id: selectedCatId, prices: [{ size: null, price: 0 }], allergens: [], is_available: true, is_visible: true, prep_time_minutes: 15, sort_order: 0 })}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            + Étel hozzáadása
          </button>
        </div>

        {selectedCategoryItems.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
            Nincs tétel ebben a kategóriában
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedCategoryItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.prices.map((p) => formatPrice(p.price) + (p.size ? ` (${p.size})` : '')).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleItemAvailable(item)}
                    className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                  >
                    {item.is_available ? 'Elérhető' : 'Nem elérhető'}
                  </button>
                </div>
                <button
                  onClick={() => setItemModal(item)}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Szerkesztés
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category modal */}
      {catModal !== null && (
        <Modal title={catModal.id ? 'Kategória szerkesztése' : 'Új kategória'} onClose={() => setCatModal(null)}>
          <div className="space-y-4">
            <Field label="Név *" value={catModal.name ?? ''} onChange={(v) => setCatModal((p) => ({ ...p, name: v }))} />
            <Field label="Angol név" value={catModal.name_en ?? ''} onChange={(v) => setCatModal((p) => ({ ...p, name_en: v }))} />
            <Field label="Leírás" value={catModal.description ?? ''} onChange={(v) => setCatModal((p) => ({ ...p, description: v }))} />
            <Field label="Sorrend" type="number" value={String(catModal.sort_order ?? 0)} onChange={(v) => setCatModal((p) => ({ ...p, sort_order: parseInt(v) || 0 }))} />
            <Toggle label="Látható" checked={catModal.is_visible ?? true} onChange={(v) => setCatModal((p) => ({ ...p, is_visible: v }))} />
            <div className="flex gap-2 pt-2">
              <button onClick={saveCategory} disabled={saving || !catModal.name} className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium disabled:opacity-60">
                {saving ? 'Mentés...' : 'Mentés'}
              </button>
              <button onClick={() => setCatModal(null)} className="flex-1 border py-2 rounded-lg text-gray-700">Mégse</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Item modal */}
      {itemModal !== null && (
        <ItemModal
          item={itemModal}
          categories={categories}
          saving={saving}
          onChange={setItemModal}
          onSave={saveItem}
          onClose={() => setItemModal(null)}
        />
      )}
    </div>
  )
}

function ItemModal({
  item,
  categories,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  item: Partial<MenuItem>
  categories: MenuCategory[]
  saving: boolean
  onChange: (v: Partial<MenuItem> | null) => void
  onSave: () => void
  onClose: () => void
}) {
  const allergens = item.allergens ?? []

  return (
    <Modal title={item.id ? 'Étel szerkesztése' : 'Új étel'} onClose={onClose} wide>
      <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">
        <Field label="Név *" value={item.name ?? ''} onChange={(v) => onChange({ ...item, name: v })} />
        <Field label="Angol név" value={item.name_en ?? ''} onChange={(v) => onChange({ ...item, name_en: v })} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leírás</label>
          <textarea
            value={item.description ?? ''}
            onChange={(e) => onChange({ ...item, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategória</label>
          <select
            value={item.category_id ?? ''}
            onChange={(e) => onChange({ ...item, category_id: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Prices */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Árak</label>
          {(item.prices ?? []).map((p, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={p.size ?? ''}
                onChange={(e) => {
                  const prices = [...(item.prices ?? [])]
                  prices[i] = { ...prices[i], size: e.target.value || null }
                  onChange({ ...item, prices })
                }}
                placeholder="Méret (pl. 32 cm)"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={p.price}
                onChange={(e) => {
                  const prices = [...(item.prices ?? [])]
                  prices[i] = { ...prices[i], price: parseInt(e.target.value) || 0 }
                  onChange({ ...item, prices })
                }}
                placeholder="Ár (Ft)"
                className="w-28 border rounded-lg px-3 py-2 text-sm"
              />
              {(item.prices?.length ?? 0) > 1 && (
                <button
                  onClick={() => onChange({ ...item, prices: (item.prices ?? []).filter((_, j) => j !== i) })}
                  className="text-red-500 hover:text-red-700 px-2"
                >✕</button>
              )}
            </div>
          ))}
          <button
            onClick={() => onChange({ ...item, prices: [...(item.prices ?? []), { size: null, price: 0 }] })}
            className="text-sm text-blue-600 hover:underline"
          >
            + Méret hozzáadása
          </button>
        </div>

        {/* Allergens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Allergének</label>
          <div className="grid grid-cols-4 gap-2">
            {ALLERGENS.map(({ code, label }) => (
              <label key={code} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={allergens.includes(code)}
                  onChange={(e) => onChange({
                    ...item,
                    allergens: e.target.checked
                      ? [...allergens, code]
                      : allergens.filter((a) => a !== code),
                  })}
                  className="w-3.5 h-3.5"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Címkék</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['is_vegetarian', 'Vegetáriánus'],
              ['is_vegan', 'Vegán'],
              ['is_spicy', 'Csípős'],
              ['is_new', 'Új'],
              ['is_popular', 'Népszerű'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(item[key as keyof MenuItem])}
                  onChange={(e) => onChange({ ...item, [key]: e.target.checked })}
                  className="w-3.5 h-3.5"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <Field
          label="Elkészítési idő (perc)"
          type="number"
          value={String(item.prep_time_minutes ?? 15)}
          onChange={(v) => onChange({ ...item, prep_time_minutes: parseInt(v) || 15 })}
        />

        <div className="flex gap-4">
          <Toggle label="Elérhető" checked={item.is_available ?? true} onChange={(v) => onChange({ ...item, is_available: v })} />
          <Toggle label="Látható" checked={item.is_visible ?? true} onChange={(v) => onChange({ ...item, is_visible: v })} />
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t mt-4">
        <button onClick={onSave} disabled={saving || !item.name} className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium disabled:opacity-60">
          {saving ? 'Mentés...' : 'Mentés'}
        </button>
        <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-gray-700">Mégse</button>
      </div>
    </Modal>
  )
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-screen overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </>
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
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-orange-500' : 'bg-gray-300'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${checked ? 'ml-4.5' : 'ml-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700">{checked ? label : label}</span>
    </label>
  )
}
