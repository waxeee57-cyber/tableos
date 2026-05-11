'use client'

import { useState } from 'react'
import Link from 'next/link'

const SAMPLE_CSV = `category,name,description,size1,price1,size2,price2
Pizzák,Margherita,Paradicsomos alap paradicsomkarika sajt,32 cm,3190,50 cm,5290
Pizzák,Sonkás,Paradicsomos alap sonka sajt,32 cm,3390,50 cm,5580
Saláták,Caesar saláta,Rómaisaláta csirkemell caesar öntet,,,
Üdítők,Coca-Cola,0.5l,,,`

export default function MenuImportPage() {
  const [csv, setCsv] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; inserted?: number; total?: number; errors?: { row: number; error: string }[]; error?: string } | null>(null)

  async function handleImport() {
    if (!csv.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/menu/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Hálózati hiba' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto pb-20 lg:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/menu" className="text-gray-500 hover:text-gray-900">← Vissza</Link>
        <h1 className="text-2xl font-bold text-gray-900">CSV Import</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 mb-2">CSV formátum</h2>
          <p className="text-sm text-gray-500 mb-3">
            Az első sor a fejléc (nem importálódik). Oszlopok: <code className="bg-gray-100 px-1 rounded">category, name, description, size1, price1, size2, price2</code>
          </p>
          <button
            onClick={() => setCsv(SAMPLE_CSV)}
            className="text-sm text-blue-600 hover:underline"
          >
            Minta CSV betöltése
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CSV tartalom</label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono h-64 focus:outline-none focus:ring-2 focus:ring-orange-200"
            placeholder="category,name,description,size1,price1,size2,price2&#10;Pizzák,Margherita,..."
          />
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {result.success ? (
              <p className="font-medium">✓ Sikeresen importálva: {result.inserted}/{result.total} tétel</p>
            ) : (
              <div>
                <p className="font-medium">Import hiba</p>
                {result.errors && (
                  <ul className="mt-2 text-sm space-y-1">
                    {result.errors.map((e) => (
                      <li key={e.row}>{e.row}. sor: {e.error}</li>
                    ))}
                  </ul>
                )}
                {result.error && <p className="text-sm mt-1">{result.error}</p>}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !csv.trim()}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold disabled:opacity-60"
        >
          {loading ? 'Import folyamatban...' : 'Import indítása'}
        </button>
      </div>
    </div>
  )
}
