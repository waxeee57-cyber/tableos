import { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminClient()
    .from('customers')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const headers = [
    'name', 'phone', 'email', 'address', 'city', 'postal_code',
    'order_count', 'total_spent', 'last_order_at', 'is_vip',
    'notes', 'created_at',
  ]

  const csv = [
    headers.join(','),
    ...(data ?? []).map((c) =>
      headers.map((h) => {
        const val = (c as Record<string, unknown>)[h]
        if (val === null || val === undefined) return ''
        const str = String(val).replace(/"/g, '""')
        return /[,"\n]/.test(str) ? `"${str}"` : str
      }).join(',')
    ),
  ].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vendegek-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
