'use client'

import { useRouter } from 'next/navigation'

export default function AdminDashboardClient() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.refresh()}
      className="text-sm text-gray-500 hover:text-gray-900 border rounded-lg px-3 py-1.5 transition-colors"
    >
      ↻ Frissítés
    </button>
  )
}
