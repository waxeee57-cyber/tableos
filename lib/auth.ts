import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AdminUser } from '@/types'

export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log('[REQADMIN-1] getUser:', user?.id ?? 'null', userError?.message ?? 'no-error')

  if (!user) {
    redirect('/admin/login')
  }

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  console.log('[REQADMIN-2] admin_users row:', adminUser?.id ?? 'null', adminError?.message ?? 'no-error', adminError?.code ?? '')

  if (!adminUser) {
    redirect('/admin/login')
  }

  return { user, adminUser: adminUser as AdminUser }
}

export async function requireAdminForAPI(): Promise<{
  user: { id: string; email?: string }
  adminUser: AdminUser
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!adminUser) return null

  return { user, adminUser: adminUser as AdminUser }
}
