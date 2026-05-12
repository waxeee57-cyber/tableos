import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { getImportSession } from '@/lib/import-sessions'
import { normalizePhone } from '@/lib/phone'
import { parseImportDate } from '@/lib/date-parse'
import type { Customer } from '@/types'

type ColumnMapping = Record<string, string>

interface MappedRow {
  name?: string
  phone?: string
  email?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  notes?: string | null
  order_count?: number
  total_spent?: number
  last_order_at?: string | null
  preferred_payment_method?: string | null
}

function applyMapping(row: string[], columns: string[], mapping: ColumnMapping): MappedRow {
  const result: MappedRow = {}
  columns.forEach((col, i) => {
    const field = mapping[col]
    if (!field || field === 'ignore') return
    const val = row[i]?.trim() ?? ''
    if (field === 'order_count') {
      result.order_count = parseInt(val) || 0
    } else if (field === 'total_spent') {
      result.total_spent = parseInt(val) || 0
    } else if (field === 'last_order_at') {
      result.last_order_at = parseImportDate(val)
    } else {
      (result as Record<string, unknown>)[field] = val || null
    }
  })
  return result
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { session_id: string; column_mapping: ColumnMapping }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const { session_id, column_mapping } = body
  if (!session_id || !column_mapping) {
    return NextResponse.json({ error: 'Hiányzó paraméterek.' }, { status: 400 })
  }

  const session = getImportSession(session_id)
  if (!session) {
    return NextResponse.json({ error: 'A munkamenet lejárt. Töltsd fel újra a fájlt.' }, { status: 404 })
  }

  const errors: Array<{ row_index: number; reason: string }> = []
  const newRows: Array<{ row_index: number; data: MappedRow }> = []
  const duplicatePhones: string[] = []

  // First pass: validate and collect phones to check
  const validRows: Array<{ row_index: number; data: MappedRow; phone: string }> = []

  session.rows.forEach((row, i) => {
    const data = applyMapping(row, session.columns, column_mapping)

    if (!data.name || !data.name.trim()) {
      errors.push({ row_index: i + 2, reason: 'Hiányzó név' })
      return
    }
    if (!data.phone) {
      errors.push({ row_index: i + 2, reason: 'Hiányzó telefonszám' })
      return
    }

    const normalized = normalizePhone(data.phone)
    if (!normalized) {
      errors.push({ row_index: i + 2, reason: `Érvénytelen telefonszám: ${data.phone}` })
      return
    }

    data.phone = normalized
    validRows.push({ row_index: i + 2, data, phone: normalized })
    duplicatePhones.push(normalized)
  })

  // Batch check which phones already exist
  const existingMap = new Map<string, Customer>()
  if (duplicatePhones.length > 0) {
    const { data: existing } = await adminClient()
      .from('customers')
      .select('*')
      .in('phone', duplicatePhones)

    for (const c of existing ?? []) {
      existingMap.set(c.phone, c as Customer)
    }
  }

  const duplicates: Array<{
    row_index: number
    phone: string
    new_data: MappedRow
    existing: Customer
  }> = []

  for (const { row_index, data, phone } of validRows) {
    const existing = existingMap.get(phone)
    if (existing) {
      duplicates.push({ row_index, phone, new_data: data, existing })
    } else {
      newRows.push({ row_index, data })
    }
  }

  return NextResponse.json({
    new_count: newRows.length,
    duplicates,
    errors,
    total_rows: session.total_rows,
  })
}
