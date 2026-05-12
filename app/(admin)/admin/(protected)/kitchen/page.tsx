import { adminClient } from '@/lib/supabase/admin'
import { getBusinessConfig } from '@/lib/config'
import type { Order, BusinessConfig } from '@/types'
import KitchenDisplayClient from '@/components/admin/KitchenDisplayClient'

export const revalidate = 0

export default async function KitchenPage() {
  const [ordersRes, config] = await Promise.all([
    adminClient().from('orders').select('*, order_items(*)').in('status', ['new', 'accepted', 'preparing', 'ready']).order('placed_at', { ascending: true }),
    getBusinessConfig(),
  ])

  return (
    <KitchenDisplayClient
      initialOrders={(ordersRes.data ?? []) as Order[]}
      config={config as BusinessConfig}
    />
  )
}
