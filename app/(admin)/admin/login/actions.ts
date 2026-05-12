'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

  if (!await rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: 'Túl sok bejelentkezési kísérlet. Próbáld 15 perc múlva.' }
  }

  console.log('[LOGIN-1] signInWithPassword starting for:', email)

  const supabase = await createClient()
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.log('[LOGIN-2] auth error:', error.message, error.status)
    return { error: 'Hibás e-mail cím vagy jelszó.' }
  }

  console.log('[LOGIN-3] auth ok, session expires_at:', data.session?.expires_at, 'user:', data.user?.id)

  // Do NOT call redirect() here. redirect() throws NEXT_REDIRECT which
  // may abort the response before Set-Cookie headers are flushed.
  // Instead return success and let the client navigate via
  // window.location.href — a full page reload that guarantees the
  // session cookies (already written to the response by setAll) are
  // present before the /admin request is sent.
  return { success: true }
}
