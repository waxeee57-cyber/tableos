import { getBusinessConfig, isOpen } from '@/lib/config'
import { adminClient } from '@/lib/supabase/admin'
import type { MenuCategory, MenuItem } from '@/types'
import PublicMenu from '@/components/public/PublicMenu'

export const dynamic = 'force-dynamic'

async function getMenuData() {
  const [categoriesRes, itemsRes] = await Promise.all([
    adminClient().from('menu_categories').select('*').eq('is_visible', true).order('sort_order'),
    adminClient().from('menu_items').select('*').eq('is_visible', true).eq('is_available', true).order('sort_order'),
  ])
  return {
    categories: (categoriesRes.data ?? []) as MenuCategory[],
    items: (itemsRes.data ?? []) as MenuItem[],
  }
}

export default async function HomePage() {
  const [config, { categories, items }] = await Promise.all([
    getBusinessConfig(),
    getMenuData(),
  ])

  const open = config ? isOpen(config) : false

  return (
    <PublicMenu
      config={config}
      categories={categories}
      items={items}
      isOpen={open}
    />
  )
}
