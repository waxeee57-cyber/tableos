import { getBusinessConfig } from '@/lib/config'
import type { BusinessConfig } from '@/types'
import AdminSettingsClient from '@/components/admin/AdminSettingsClient'
import { adminClient } from '@/lib/supabase/admin'
import type { DeliveryZone } from '@/types'

export const revalidate = 0

export default async function SettingsPage() {
  const [config, zonesRes] = await Promise.all([
    getBusinessConfig(),
    adminClient().from('delivery_zones').select('*').order('sort_order'),
  ])

  return (
    <AdminSettingsClient
      initialConfig={config as BusinessConfig}
      initialZones={(zonesRes.data ?? []) as DeliveryZone[]}
    />
  )
}
