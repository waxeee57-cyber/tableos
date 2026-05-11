import { adminClient } from '@/lib/supabase/admin'
import type { MenuCategory, MenuItem } from '@/types'
import AdminMenuClient from '@/components/admin/AdminMenuClient'

export const revalidate = 0

export default async function MenuPage() {
  const [categoriesRes, itemsRes] = await Promise.all([
    adminClient().from('menu_categories').select('*').order('sort_order'),
    adminClient().from('menu_items').select('*').order('sort_order'),
  ])

  return (
    <AdminMenuClient
      initialCategories={(categoriesRes.data ?? []) as MenuCategory[]}
      initialItems={(itemsRes.data ?? []) as MenuItem[]}
    />
  )
}
