import { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PAGE_SIZE = 5000

export async function GET(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.adminUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cursor = new URL(request.url).searchParams.get('cursor') ?? null

  let query = adminClient()
    .from('customers')
    .select('*')
    .order('name')
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    query = query.gt('name', cursor)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const hasMore = rows.length > PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? (pageRows[pageRows.length - 1] as { name: string }).name : null

  const headers = [
    'name', 'phone', 'email', 'address', 'city', 'postal_code',
    'order_count', 'total_spent', 'last_order_at', 'is_vip',
    'notes', 'created_at',
  ]

  const csv = [
    headers.join(','),
    ...pageRows.map((c) =>
      headers.map((h) => {
        const val = (c as Record<string, unknown>)[h]
        if (val === null || val === undefined) return ''
        const str = String(val).replace(/"/g, '""')
        return /[,"\n]/.test(str) ? `"${str}"` : str
      }).join(',')
    ),
  ].join('\n')

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="vendegek-${new Date().toISOString().split('T')[0]}.csv"`,
  }
  if (nextCursor) {
    responseHeaders['X-Next-Cursor'] = nextCursor
  }

  return new Response(csv, { headers: responseHeaders })
}
