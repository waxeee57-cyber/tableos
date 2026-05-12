import { adminClient } from '@/lib/supabase/admin'

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { data } = await adminClient()
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('key', key)
    .maybeSingle()

  const now = Date.now()
  const windowExpired = !data || new Date(data.window_start as string).getTime() < now - windowMs

  if (!windowExpired && (data?.attempts ?? 0) >= limit) {
    return false
  }

  if (windowExpired) {
    await adminClient()
      .from('rate_limits')
      .upsert({ key, attempts: 1, window_start: new Date(now).toISOString() }, { onConflict: 'key' })
  } else {
    await adminClient()
      .from('rate_limits')
      .update({ attempts: (data?.attempts ?? 0) + 1 })
      .eq('key', key)
  }

  return true
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
