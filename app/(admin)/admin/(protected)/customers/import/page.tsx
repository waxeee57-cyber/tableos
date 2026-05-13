'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Stage = 'upload' | 'mapping' | 'preview' | 'confirm'
type Decision = 'skip' | 'merge' | 'keep_both'

interface ParseResult {
  columns: string[]
  rows: string[][]
  total_rows: number
  session_id: string
  filename: string
}

interface DuplicateRow {
  row_index: number
  phone: string
  new_data: Record<string, unknown>
  existing: Record<string, unknown>
}

interface PreviewResult {
  new_count: number
  duplicates: DuplicateRow[]
  errors: Array<{ row_index: number; reason: string }>
  total_rows: number
}

interface ExecuteResult {
  imported: number
  duplicates: number
  errors: number
  warning?: string
}

const TARGET_FIELDS = [
  { value: 'ignore', label: 'Figyelmen kívül hagyás' },
  { value: 'name', label: 'Név (name)' },
  { value: 'phone', label: 'Telefon (phone)' },
  { value: 'email', label: 'Email (email)' },
  { value: 'address', label: 'Cím (address)' },
  { value: 'city', label: 'Város (city)' },
  { value: 'postal_code', label: 'Irányítószám (postal_code)' },
  { value: 'notes', label: 'Megjegyzés (notes)' },
  { value: 'order_count', label: 'Rendelés szám (order_count)' },
  { value: 'total_spent', label: 'Összes költés (total_spent)' },
  { value: 'last_order_at', label: 'Utolsó rendelés (last_order_at)' },
  { value: 'preferred_payment_method', label: 'Kedvelt fizetés' },
]

const FIELD_PATTERNS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /name|n[eé]v|nev|v[aá]s[aá]rl[oó]|customer/i, field: 'name' },
  { pattern: /phone|tel|telefon|mobile/i, field: 'phone' },
  { pattern: /email|e-mail/i, field: 'email' },
  { pattern: /address|lakc[ií]m|street/i, field: 'address' },
  { pattern: /city|v[aá]ros|telep[uü]l[eé]s|town/i, field: 'city' },
  { pattern: /postal|zip|ir[aá]ny[ií]t[oó]|isz/i, field: 'postal_code' },
  { pattern: /note|megjegyz|comment/i, field: 'notes' },
  { pattern: /order.?count|rendel[eé]s.?sz[aá]m/i, field: 'order_count' },
  { pattern: /spent|k[oö]lt[eé]s|[oö]sszesen/i, field: 'total_spent' },
  { pattern: /last.?order|utols[oó].?rendel[eé]s/i, field: 'last_order_at' },
]

function autoDetect(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const used = new Set<string>()
  for (const col of columns) {
    let matched = false
    for (const { pattern, field } of FIELD_PATTERNS) {
      if (pattern.test(col) && !used.has(field)) {
        mapping[col] = field
        used.add(field)
        matched = true
        break
      }
    }
    if (!matched) mapping[col] = 'ignore'
  }
  return mapping
}

export default function ImportPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Stage 1: Upload ---
  async function handleFile(file: File) {
    setError(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Csak .csv fájl fogadható el.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A fájl túl nagy. Maximum 5 MB.')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/customers/import/parse', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Hiba a feltöltés során.'); return }
      setParseResult(json)
      setMapping(autoDetect(json.columns))
      setStage('mapping')
    } catch {
      setError('Hálózati hiba. Próbáld újra.')
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // --- Stage 2: Mapping ---
  function isMappingValid() {
    const vals = Object.values(mapping)
    return vals.includes('name') && vals.includes('phone')
  }

  async function handleMappingNext() {
    if (!parseResult || !isMappingValid()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/customers/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: parseResult.session_id, column_mapping: mapping }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Hiba az előnézet során.'); return }
      setPreviewResult(json)
      // Default all duplicates to 'skip'
      const defaultDecisions: Record<string, Decision> = {}
      for (const dup of json.duplicates ?? []) {
        defaultDecisions[String(dup.row_index)] = 'skip'
      }
      setDecisions(defaultDecisions)
      setStage('preview')
    } catch {
      setError('Hálózati hiba.')
    } finally {
      setLoading(false)
    }
  }

  // --- Stage 3: Preview ---
  function setBulkDecision(d: Decision) {
    if (!previewResult) return
    const bulk: Record<string, Decision> = {}
    for (const dup of previewResult.duplicates) {
      bulk[String(dup.row_index)] = d
    }
    setDecisions(bulk)
  }

  // --- Stage 4: Execute ---
  async function handleExecute() {
    if (!parseResult) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/customers/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: parseResult.session_id,
          column_mapping: mapping,
          duplicate_decisions: decisions,
          filename: parseResult.filename,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Hiba az importálás során.'); return }
      setExecuteResult(json)
    } catch {
      setError('Hálózati hiba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto pb-24 lg:pb-8">
      <button
        onClick={() => router.push('/admin/customers')}
        className="text-sm text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1"
      >
        ← Vissza a vendégekhez
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Vendégek importálása</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-gray-400 mb-6">
        {(['upload', 'mapping', 'preview', 'confirm'] as Stage[]).map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
              stage === s ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{i + 1}</span>
            {['Feltöltés', 'Mapping', 'Előnézet', 'Megerősítés'][i]}
            {i < 3 && <span className="text-gray-300">›</span>}
          </span>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ---- Stage 1: Upload ---- */}
      {stage === 'upload' && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-3xl mb-3">📁</div>
            <p className="text-gray-700 font-medium">Húzd ide a CSV fájlt vagy kattints ide</p>
            <p className="text-sm text-gray-400 mt-1">UTF-8 kódolás ajánlott · Maximum 5 MB</p>
            {loading && <p className="text-sm text-orange-500 mt-3">Feltöltés...</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
          />

          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Elvárt oszlopok:</p>
            <ul className="space-y-0.5 list-disc ml-4 text-xs text-gray-500">
              <li><strong>name</strong> (kötelező)</li>
              <li><strong>phone</strong> (kötelező)</li>
              <li>email, address, city, postal_code, notes (opcionális)</li>
            </ul>
          </div>
        </div>
      )}

      {/* ---- Stage 2: Column mapping ---- */}
      {stage === 'mapping' && parseResult && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Oszlopok hozzárendelése</h2>
          <div className="bg-white rounded-xl border overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left">CSV oszlop</th>
                  <th className="px-4 py-2 text-left">TableOS mező</th>
                </tr>
              </thead>
              <tbody>
                {parseResult.columns.map((col) => (
                  <tr key={col} className="border-b last:border-0">
                    <td className="px-4 py-2 text-gray-700 font-medium">{col}</td>
                    <td className="px-4 py-2">
                      <select
                        value={mapping[col] ?? 'ignore'}
                        onChange={(e) => setMapping((m) => ({ ...m, [col]: e.target.value }))}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        {TARGET_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview rows */}
          {parseResult.rows.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Előnézet (első 3 sor):</p>
              <div className="space-y-1">
                {parseResult.rows.slice(0, 3).map((row, i) => (
                  <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 truncate">
                    {row.join(' · ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isMappingValid() && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
              A &quot;Név&quot; és &quot;Telefon&quot; mezőt kötelező hozzárendelni.
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStage('upload')} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">← Vissza</button>
            <button
              onClick={handleMappingNext}
              disabled={loading || !isMappingValid()}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Ellenőrzés...' : 'Tovább →'}
            </button>
          </div>
        </div>
      )}

      {/* ---- Stage 3: Preview ---- */}
      {stage === 'preview' && previewResult && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Előnézet és duplikációk</h2>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <StatBox value={String(previewResult.total_rows)} label="Összesen" color="gray" />
            <StatBox value={String(previewResult.new_count)} label="Új vendég" color="green" />
            <StatBox value={String(previewResult.duplicates.length)} label="Duplikáció" color="yellow" />
            <StatBox value={String(previewResult.errors.length)} label="Hiba" color="red" />
          </div>

          {/* Duplicates */}
          {previewResult.duplicates.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Duplikációk ({previewResult.duplicates.length})</h3>
                <div className="flex gap-1">
                  {(['skip', 'merge', 'keep_both'] as Decision[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setBulkDecision(d)}
                      className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50"
                    >
                      {d === 'skip' ? 'Mind: Skip' : d === 'merge' ? 'Mind: Merge' : 'Mind: Megtart'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {previewResult.duplicates.slice(0, 10).map((dup) => (
                  <DupCard
                    key={dup.row_index}
                    dup={dup}
                    decision={decisions[String(dup.row_index)] ?? 'skip'}
                    onChange={(d) => setDecisions((prev) => ({ ...prev, [String(dup.row_index)]: d }))}
                  />
                ))}
                {previewResult.duplicates.length > 10 && (
                  <p className="text-xs text-gray-400 text-center">...és még {previewResult.duplicates.length - 10} duplikáció</p>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {previewResult.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Hibák ({previewResult.errors.length}) — ezek nem lesznek importálva</h3>
              <div className="bg-red-50 rounded-xl p-3 space-y-1">
                {previewResult.errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    {e.row_index}. sor: {e.reason}
                  </p>
                ))}
                {previewResult.errors.length > 10 && (
                  <p className="text-xs text-red-400">...és még {previewResult.errors.length - 10} hiba</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStage('mapping')} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50">← Vissza</button>
            <button
              onClick={() => setStage('confirm')}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
            >
              Importálás indítása →
            </button>
          </div>
        </div>
      )}

      {/* ---- Stage 4: Confirm / Execute ---- */}
      {stage === 'confirm' && previewResult && !executeResult && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Megerősítés</h2>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1.5 text-sm text-gray-700">
            <p>✓ <strong>{previewResult.new_count}</strong> új vendég</p>
            <p>⚙ <strong>{Object.values(decisions).filter((d) => d === 'merge').length}</strong> duplikáció MERGE módban</p>
            <p>⏭ <strong>{Object.values(decisions).filter((d) => d === 'skip').length}</strong> duplikáció SKIP módban</p>
            <p>📋 <strong>{Object.values(decisions).filter((d) => d === 'keep_both').length}</strong> duplikáció megtartva</p>
            {previewResult.errors.length > 0 && (
              <p className="text-red-600">✗ <strong>{previewResult.errors.length}</strong> hibás sor (nem lesz importálva)</p>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Az importálás után az import naplóban visszakövethető lesz, de nem vonható vissza automatikusan.
          </p>

          {loading && (
            <div className="flex items-center gap-2 mb-4 text-sm text-orange-600">
              <span className="animate-spin">⏳</span> Importálás folyamatban...
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStage('preview')} disabled={loading} className="flex-1 py-2.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Mégse</button>
            <button
              onClick={handleExecute}
              disabled={loading}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Importálás...' : 'Importálás megerősítése →'}
            </button>
          </div>
        </div>
      )}

      {/* ---- Done ---- */}
      {executeResult && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">{executeResult.warning ? '⚠️' : '✅'}</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {executeResult.warning ? 'Import problémával zárult' : 'Importálás kész!'}
          </h2>
          {executeResult.warning ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3 mx-auto max-w-md">
              {executeResult.warning}
            </p>
          ) : (
            <p className="text-gray-600 mb-1"><strong>{executeResult.imported}</strong> vendég sikeresen importálva.</p>
          )}
          {executeResult.errors > 0 && (
            <p className="text-sm text-red-600 mb-1">{executeResult.errors} sor hibával.</p>
          )}
          <button
            onClick={() => router.push('/admin/customers')}
            className="mt-6 px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
          >
            Vendégek megtekintése →
          </button>
        </div>
      )}
    </div>
  )
}

function DupCard({
  dup, decision, onChange,
}: {
  dup: DuplicateRow
  decision: Decision
  onChange: (d: Decision) => void
}) {
  const existing = dup.existing as Record<string, unknown>
  const newData = dup.new_data as Record<string, unknown>

  return (
    <div className="bg-white border rounded-xl p-3 text-sm">
      <p className="font-medium text-gray-700 mb-2">{dup.phone}</p>
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="font-medium text-gray-500 mb-1">Meglévő</p>
          <p>{String(existing.name ?? '')}</p>
          <p className="text-gray-400">{String(existing.order_count ?? 0)} rendel. · {String(existing.total_spent ?? 0)} Ft</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2">
          <p className="font-medium text-blue-500 mb-1">Importból</p>
          <p>{String(newData.name ?? '')}</p>
          <p className="text-gray-400">{String(newData.order_count ?? 0)} rendel. · {String(newData.total_spent ?? 0)} Ft</p>
        </div>
      </div>
      <div className="flex gap-2">
        {(['skip', 'merge', 'keep_both'] as Decision[]).map((d) => (
          <label key={d} className="flex items-center gap-1 cursor-pointer text-xs">
            <input
              type="radio"
              name={`dup-${dup.row_index}`}
              value={d}
              checked={decision === d}
              onChange={() => onChange(d)}
              className="accent-orange-500"
            />
            {d === 'skip' ? 'Skip' : d === 'merge' ? 'Merge' : 'Megtart mindkettőt'}
          </label>
        ))}
      </div>
    </div>
  )
}

function StatBox({ value, label, color }: { value: string; label: string; color: 'gray' | 'green' | 'yellow' | 'red' }) {
  const colorCls = {
    gray: 'bg-gray-50 text-gray-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
  }[color]
  return (
    <div className={`rounded-xl p-3 text-center ${colorCls}`}>
      <p className="font-bold text-lg">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  )
}
