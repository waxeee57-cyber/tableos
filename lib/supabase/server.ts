import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
            console.log('[COOKIES] setAll wrote', cookiesToSet.length, 'cookie(s):', cookiesToSet.map(c => c.name))
          } catch (e) {
            // Normal in Server Components where cookies are read-only.
            // In Server Actions this should NOT fire — if it does, session
            // cookies are being silently dropped.
            console.log('[COOKIES] setAll blocked (read-only context?):', String(e))
          }
        },
      },
    }
  )
}
