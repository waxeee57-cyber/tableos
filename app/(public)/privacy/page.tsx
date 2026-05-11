import { getBusinessConfig } from '@/lib/config'
import Link from 'next/link'

export default async function PrivacyPage() {
  const config = await getBusinessConfig()
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Vissza</Link>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Adatvédelmi Tájékoztató</h1>
        <div className="text-gray-700 space-y-4">
          <p>Az {config?.business_name ?? 'étterem'} elkötelezett az Ön személyes adatainak védelme iránt.</p>
          <h2 className="text-xl font-semibold mt-6">Gyűjtött adatok</h2>
          <p>Rendelés leadásakor az alábbi adatokat kezeljük: név, telefonszám, e-mail cím (opcionális), szállítási cím.</p>
          <h2 className="text-xl font-semibold mt-6">Adatkezelés célja</h2>
          <p>Az adatokat kizárólag a rendelés teljesítéséhez és visszaigazolásához használjuk fel.</p>
          <h2 className="text-xl font-semibold mt-6">Adatmegőrzés</h2>
          <p>Az adatokat a rendelés teljesítésétől számított 5 évig őrizzük meg a számviteli törvény előírásainak megfelelően.</p>
          <h2 className="text-xl font-semibold mt-6">Kapcsolat</h2>
          <p>Adatvédelemmel kapcsolatos kérdésekkel forduljon hozzánk: {config?.email ?? config?.phone ?? 'közvetlenül az étteremhez'}</p>
        </div>
      </main>
    </div>
  )
}
