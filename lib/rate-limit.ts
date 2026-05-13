import { adminClient } from '@/lib/supabase/admin'

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { data, error } = await adminClient().rpc('check_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  })

  if (error) {
    // Fail open: if the DB is unreachable, don't block legitimate requests
    console.error('[rate-limit]', error.message)
    return true
  }

  return data as boolean
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
