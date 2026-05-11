'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '◼', exact: true },
  { href: '/admin/menu', label: 'Étlap', icon: '☰' },
  { href: '/admin/orders', label: 'Rendelések', icon: '🛒' },
  { href: '/admin/kitchen', label: 'Konyha', icon: '🍳', kitchenOnly: true },
  { href: '/admin/settings', label: 'Beállítások', icon: '⚙', adminOnly: true },
]

interface Props {
  role: 'admin' | 'staff' | 'kitchen'
}

export default function AdminSidebar({ role }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (role === 'kitchen') return item.kitchenOnly === true
    if (item.kitchenOnly) return false
    if (item.adminOnly) return role === 'admin'
    return true
  })

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white border-r flex-col z-20">
        <div className="px-5 py-5 border-b">
          <span className="font-bold text-gray-900 text-lg">TableOS</span>
          <span className="ml-2 text-xs text-gray-400 uppercase font-medium">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href, item.exact)
                  ? 'bg-orange-50 text-orange-600 border-l-2 border-orange-500 pl-[10px]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <span>→</span> Kilépés
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-20 flex">
        {visibleItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs gap-1 transition-colors ${
              isActive(item.href, item.exact) ? 'text-orange-500' : 'text-gray-500'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="leading-none">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
