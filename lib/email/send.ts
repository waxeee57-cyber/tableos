import { Resend } from 'resend'

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  const client = getResend()
  const sender = from ?? `noreply@${process.env.NEXT_PUBLIC_SITE_URL?.replace(/https?:\/\//, '') ?? 'tableos.app'}`

  if (!client) {
    console.log('[Email — no RESEND_API_KEY]', { to, subject })
    return { success: true, simulated: true }
  }

  try {
    const result = await client.emails.send({ from: sender, to, subject, html })
    return { success: true, id: result.data?.id }
  } catch (err) {
    console.error('[Email send error]', err)
    return { success: false, error: err }
  }
}
