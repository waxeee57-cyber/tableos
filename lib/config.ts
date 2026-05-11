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
      cached = data as BusinessConfig
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
  const now = new Date()
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const day = days[now.getDay()]
  const hours = config.operating_hours[day]

  if (!hours) return false

  const [openH, openM] = hours.open.split(':').map(Number)
  const [closeH, closeM] = hours.close.split(':').map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
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
