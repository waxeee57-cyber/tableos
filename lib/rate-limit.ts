const store = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart)

  if (timestamps.length >= limit) return false

  timestamps.push(now)
  store.set(key, timestamps)

  // Prune keys with no recent activity to prevent unbounded memory growth
  if (store.size > 10_000) {
    for (const [k, ts] of store) {
      if (ts.every((t) => t <= windowStart)) store.delete(k)
    }
  }

  return true
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
