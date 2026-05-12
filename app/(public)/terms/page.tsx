import { getBusinessConfig } from '@/lib/config'
import Link from 'next/link'

export default async function TermsPage() {
  const config = await getBusinessConfig()
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-4">
        <Link href="/menu" className="text-sm text-gray-500 hover:text-gray-900">← Vissza</Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Általános Szerződési Feltételek</h1>
        <div className="prose prose-gray text-gray-700 space-y-4">
          <p>Ez az oldal az {config?.business_name ?? 'éttermünk'} általános szerződési feltételeit tartalmazza.</p>
          <p>A rendelés leadásával Ön elfogadja az alábbi feltételeket.</p>
          <h2 className="text-xl font-semibold mt-6">1. Rendelés</h2>
          <p>A rendelés leadása az online felületen keresztül lehetséges. Az elfogadásról visszaigazolást küldünk.</p>
          <h2 className="text-xl font-semibold mt-6">2. Fizetés</h2>
          <p>Fizetés készpénzben, bankkártyával vagy SZÉP kártyával lehetséges az átadáskor.</p>
          <h2 className="text-xl font-semibold mt-6">3. Szállítás</h2>
          <p>A szállítási idő tájékoztató jellegű, forgalomtól függően változhat.</p>
          <h2 className="text-xl font-semibold mt-6">4. Lemondás</h2>
          <p>A rendelés leadása után az étterem telefonszámán mondható le.</p>
        </div>
      </main>
    </div>
  )
}
