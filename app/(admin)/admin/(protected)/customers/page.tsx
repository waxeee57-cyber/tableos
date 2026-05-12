import { adminClient } from '@/lib/supabase/admin'
import type { Customer } from '@/types'
import AdminCustomersClient from '@/components/admin/AdminCustomersClient'

export const revalidate = 0

async function getInitialCustomers() {
  const { data, count } = await adminClient()
    .from('customers')
    .select('*', { count: 'exact' })
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .limit(50)

  return { customers: (data ?? []) as Customer[], total: count ?? 0 }
}

export default async function CustomersPage() {
  const { customers, total } = await getInitialCustomers()

  return <AdminCustomersClient initialCustomers={customers} initialTotal={total} />
}
