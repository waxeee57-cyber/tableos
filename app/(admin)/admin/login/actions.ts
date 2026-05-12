'use server'

import { createClient } from '@/lib/supabase/server'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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
