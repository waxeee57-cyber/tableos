import { adminClient } from '@/lib/supabase/admin'
import type { BusinessConfig } from '@/types'

let cached: BusinessConfig | null = null
let cacheTime = 0
const CACHE_TTL = 60_000

export async function getBusinessConfig(): Promise<BusinessConfig | null> {
  if (cached && Date.now() - cacheTime < CACHE_TTL) return cached

  try {
    const { data } = await adminClient().from('business_config').select('*').single()

    if (data) {
      const raw = data as Record<string, unknown>
      cached = {
        ...raw,
        total_customers: (raw.total_customers as number) ?? 0,
        scheduling_enabled: (raw.scheduling_enabled as boolean) ?? false,
        scheduling_days_ahead: (raw.scheduling_days_ahead as number) ?? 7,
        scheduling_slot_minutes: (raw.scheduling_slot_minutes as number) ?? 30,
        reservations_enabled: (raw.reservations_enabled as boolean) ?? false,
        reservations_days_ahead: (raw.reservations_days_ahead as number) ?? 60,
        reservations_slot_minutes: (raw.reservations_slot_minutes as number) ?? 30,
        max_party_size: (raw.max_party_size as number) ?? 20,
        online_payment_enabled: (raw.online_payment_enabled as boolean) ?? false,
        cash_on_delivery_enabled: (raw.cash_on_delivery_enabled as boolean) ?? true,
        cash_on_pickup_enabled: (raw.cash_on_pickup_enabled as boolean) ?? true,
        onboarding_completed: (raw.onboarding_completed as boolean) ?? false,
        onboarding_step: (raw.onboarding_step as number) ?? 0,
      } as BusinessConfig
      cacheTime = Date.now()
    }

    return cached
  } catch {
    return null
  }
}

export function invalidateConfigCache() {
  cached = null
  cacheTime = 0
}

export function isOpen(config: BusinessConfig): boolean {
  const tz = config.timezone ?? 'Europe/Budapest'
  const now = new Date()

  // Get current weekday abbreviation in the business timezone
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
    .format(now)
    .toLowerCase()
    .slice(0, 3)

  const hours = config.operating_hours[day]
  if (!hours) return false

  // Get current HH:MM in the business timezone
  const tzTime = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)

  const [currentH, currentM] = tzTime.replace(/^24/, '00').split(':').map(Number)
  const [openH, openM] = hours.open.split(':').map(Number)
  const [closeH, closeM] = hours.close.split(':').map(Number)

  const currentMinutes = currentH * 60 + currentM
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

export function generateOrderNumber(businessName: string): string {
  const prefix = businessName
    .replace(/[^a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, '')
    .substring(0, 2)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') || 'TO'
  const number = Math.floor(100000 + Math.random() * 900000)
  return `${prefix}-${number}`
}
