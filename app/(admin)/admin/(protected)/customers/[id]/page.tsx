import { adminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import type { Customer } from '@/types'
import AdminCustomerDetailClient from '@/components/admin/AdminCustomerDetailClient'

export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCustomerData(id: string) {
  const [customerRes, ordersRes] = await Promise.all([
    adminClient().from('customers').select('*').eq('id', id).single(),
    adminClient()
      .from('orders')
      .select('id, order_number, total, status, placed_at, order_items(item_name, item_size, quantity)')
      .eq('customer_id', id)
      .order('placed_at', { ascending: false })
      .limit(10),
  ])

  if (customerRes.error || !customerRes.data) return null

  return {
    customer: customerRes.data as Customer,
    orders: ordersRes.data ?? [],
  }
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params
  const data = await getCustomerData(id)

  if (!data) notFound()

  return <AdminCustomerDetailClient customer={data.customer} orders={data.orders} />
}
