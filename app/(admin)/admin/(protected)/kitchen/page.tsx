import { adminClient } from '@/lib/supabase/admin'
import { getBusinessConfig } from '@/lib/config'
import type { Order, BusinessConfig } from '@/types'
import KitchenDisplayClient from '@/components/admin/KitchenDisplayClient'

export const revalidate = 0

export default async function KitchenPage() {
  const [ordersRes, config] = await Promise.all([
    adminClient()
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['new', 'accepted', 'preparing', 'ready'])
      .order('placed_at', { ascending: true }),
    getBusinessConfig(),
  ])

  // Exclude scheduled orders that are more than 30 minutes away (server-side filter)
  const thirtyMinFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const orders = ((ordersRes.data ?? []) as Order[]).filter((o) => {
    if (!o.is_scheduled) return true
    if (!o.scheduled_for) return true
    return o.scheduled_for <= thirtyMinFromNow
  })

  return (
    <KitchenDisplayClient
      initialOrders={orders}
      config={config as BusinessConfig}
    />
  )
}
