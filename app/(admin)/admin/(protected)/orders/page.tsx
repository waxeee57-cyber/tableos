import { adminClient } from '@/lib/supabase/admin'
import { getBusinessConfig } from '@/lib/config'
import type { Order, BusinessConfig } from '@/types'
import AdminOrdersClient from '@/components/admin/AdminOrdersClient'

export const revalidate = 0

export default async function OrdersPage() {
  const [ordersRes, config] = await Promise.all([
    adminClient().from('orders').select('*, order_items(*)').not('status', 'in', '("completed","cancelled","rejected")').order('placed_at', { ascending: false }).limit(100),
    getBusinessConfig(),
  ])

  return (
    <AdminOrdersClient
      initialOrders={(ordersRes.data ?? []) as Order[]}
      config={config as BusinessConfig}
    />
  )
}
