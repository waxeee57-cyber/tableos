import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

const HEADERS = [
  'name', 'phone', 'email', 'address', 'city', 'postal_code',
  'order_count', 'total_spent', 'last_order_at', 'is_vip',
  'notes', 'created_at',
]

function csvRow(c: Record<string, unknown>): string {
  return HEADERS.map((h) => {
    const val = c[h]
    if (val === null || val === undefined) return ''
    const str = String(val).replace(/"/g, '""')
    return /[,"\n]/.test(str) ? `"${str}"` : str
  }).join(',')
}

export async function GET() {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const PAGE = 1000
  let offset = 0
  const rows: string[] = [HEADERS.join(',')]

  while (true) {
    const { data, error } = await adminClient()
      .from('customers')
      .select(HEADERS.join(', '))
      .order('name')
      .range(offset, offset + PAGE - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    for (const c of data ?? []) {
      rows.push(csvRow(c as unknown as Record<string, unknown>))
    }

    if ((data?.length ?? 0) < PAGE) break
    offset += PAGE
  }

  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vendegek-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
