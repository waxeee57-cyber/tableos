import { getBusinessConfig } from '@/lib/config'
import type { BusinessConfig } from '@/types'
import ReservationForm from '@/components/public/ReservationForm'

export const dynamic = 'force-dynamic'

export default async function ReservePage() {
  const config = await getBusinessConfig()

  if (!config?.reservations_enabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">📅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Online foglalás nem elérhető</h1>
          <p className="text-gray-500">
            Online foglalás jelenleg nem érhető el.{config?.phone ? ` Hívjon minket: ` : ''}
            {config?.phone && (
              <a href={`tel:${config.phone}`} className="text-orange-600 font-medium hover:underline">
                {config.phone}
              </a>
            )}
          </p>
        </div>
      </div>
    )
  }

  return <ReservationForm config={config as BusinessConfig} />
}
