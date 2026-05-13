import { requireAdmin } from '@/lib/auth'
import { getBusinessConfig } from '@/lib/config'
import AdminSidebar from '@/components/admin/AdminSidebar'
import ServiceWorkerRegister from '@/components/admin/ServiceWorkerRegister'
import { redirect } from 'next/navigation'

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [{ adminUser }, config] = await Promise.all([
    requireAdmin(),
    getBusinessConfig(),
  ])

  if (config && !config.onboarding_completed) {
    redirect('/admin/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        role={adminUser.role}
        reservationsEnabled={config?.reservations_enabled ?? false}
      />
      <main className="flex-1 min-w-0 lg:ml-60">{children}</main>
      <ServiceWorkerRegister />
    </div>
  )
}
