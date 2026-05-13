import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const { is_vip } = body as Record<string, unknown>

  const { error } = await adminClient()
    .from('customers')
    .update({ is_vip: !!is_vip, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    // Migration 04 not yet applied
    if (error.code === 'PGRST204' || error.message?.includes('schema cache')) {
      return NextResponse.json(
        { error: 'A VIP funkció még nem elérhető. Alkalmazza a 04_customers_enhancements.sql migrációt.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
