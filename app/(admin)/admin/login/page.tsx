'use client'

import { useState, useTransition } from 'react'
import { loginAction } from './actions'

export default function AdminLoginPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await loginAction(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      if (result?.success) {
        // Full page reload: guarantees session cookies written by the
        // Server Action are sent with the /admin request.
        window.location.href = '/admin'
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin belépés</h1>
          <p className="text-sm text-gray-500 mt-1">TableOS kezelőfelület</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail cím</label>
            <input
              type="email"
              name="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              placeholder="admin@etterem.hu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jelszó</label>
            <input
              type="password"
              name="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Belépés...' : 'Belépés'}
          </button>
        </form>
      </div>
    </div>
  )
}
