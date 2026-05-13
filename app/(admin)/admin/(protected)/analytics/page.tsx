import { requireAdmin } from '@/lib/auth'
import { getBusinessConfig } from '@/lib/config'
import type { BusinessConfig } from '@/types'
import AdminAnalyticsClient from '@/components/admin/AdminAnalyticsClient'

export const revalidate = 0

export default async function AnalyticsPage() {
  const [, config] = await Promise.all([requireAdmin(), getBusinessConfig()])

  return <AdminAnalyticsClient config={config as BusinessConfig} />
}
