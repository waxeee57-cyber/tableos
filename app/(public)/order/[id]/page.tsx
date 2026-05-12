import { adminClient } from '@/lib/supabase/admin'
import type { Order, OrderItem, BusinessConfig } from '@/types'
import { notFound } from 'next/navigation'
import { getBusinessConfig } from '@/lib/config'
import OrderTracker from '@/components/public/OrderTracker'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params

  const config = await getBusinessConfig()
  const orderRes = await adminClient().from('orders').select('*').eq('id', id).single()
  const itemsRes = await adminClient().from('order_items').select('*').eq('order_id', id).order('created_at')

  if (!orderRes.data) notFound()

  return (
    <OrderTracker
      order={orderRes.data as Order}
      items={(itemsRes.data ?? []) as OrderItem[]}
      config={config as BusinessConfig}
      estimatedMinutes={config?.estimated_delivery_minutes}
    />
  )
}
