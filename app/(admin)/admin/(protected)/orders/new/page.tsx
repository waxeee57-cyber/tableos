import { adminClient } from '@/lib/supabase/admin'
import { getBusinessConfig } from '@/lib/config'
import type { MenuCategory, MenuItem, DeliveryZone, BusinessConfig } from '@/types'
import AdminNewOrderClient from '@/components/admin/AdminNewOrderClient'

export const revalidate = 0

export default async function NewOrderPage() {
  const [categoriesRes, itemsRes, zonesRes, config] = await Promise.all([
    adminClient()
      .from('menu_categories')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true }),
    adminClient()
      .from('menu_items')
      .select('*')
      .eq('is_visible', true)
      .eq('is_available', true)
      .order('sort_order', { ascending: true }),
    adminClient()
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    getBusinessConfig(),
  ])

  return (
    <AdminNewOrderClient
      categories={(categoriesRes.data ?? []) as MenuCategory[]}
      items={(itemsRes.data ?? []) as MenuItem[]}
      deliveryZones={(zonesRes.data ?? []) as DeliveryZone[]}
      config={config as BusinessConfig}
    />
  )
}
