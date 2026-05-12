import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { getImportSession } from '@/lib/import-sessions'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { normalizePhone } from '@/lib/phone'
import { parseImportDate } from '@/lib/date-parse'

type ColumnMapping = Record<string, string>
type DuplicateDecision = 'skip' | 'merge' | 'keep_both'

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

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIP(request)
  if (!rateLimit(`import-execute:${ip}`, 2, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Túl sok importálási kísérlet. Próbáld egy óra múlva.' }, { status: 429 })
  }

  let body: {
    session_id: string
    column_mapping: ColumnMapping
    duplicate_decisions: Record<string, DuplicateDecision>
    filename?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const { session_id, column_mapping, duplicate_decisions, filename } = body
  if (!session_id || !column_mapping || !duplicate_decisions) {
    return NextResponse.json({ error: 'Hiányzó paraméterek.' }, { status: 400 })
  }

  const session = getImportSession(session_id)
  if (!session) {
    return NextResponse.json({ error: 'A munkamenet lejárt. Töltsd fel újra a fájlt.' }, { status: 404 })
  }

  // Create import audit record
  const { data: importRecord } = await adminClient()
    .from('customer_imports')
    .insert({
      filename: filename ?? null,
      total_rows: session.total_rows,
      status: 'pending',
      created_by: auth.user.id,
    })
    .select('id')
    .single()

  const importId = importRecord?.id

  const now = new Date().toISOString()
  let importedCount = 0
  let duplicatesCount = 0
  let errorsCount = 0
  const errorLog: Array<{ row_index: number; reason: string }> = []

  // Collect all phones for duplicate check
  const allPhones = session.rows
    .map((row, i) => {
      const data = applyMapping(row, session.columns, column_mapping)
      if (!data.phone) return null
      const normalized = normalizePhone(data.phone)
      return normalized ? { phone: normalized, row_index: i + 2 } : null
    })
    .filter(Boolean) as Array<{ phone: string; row_index: number }>

  const { data: existingCustomers } = await adminClient()
    .from('customers')
    .select('id, phone, order_count, total_spent')
    .in('phone', allPhones.map((p) => p.phone))

  const existingMap = new Map(
    (existingCustomers ?? []).map((c) => [c.phone, c])
  )

  // Process rows
  const toInsert: unknown[] = []
  const toMerge: Array<{ id: string; updates: Record<string, unknown> }> = []

  session.rows.forEach((row, i) => {
    const rowIndex = i + 2
    const data = applyMapping(row, session.columns, column_mapping)

    if (!data.name?.trim()) {
      errorsCount++
      errorLog.push({ row_index: rowIndex, reason: 'Hiányzó név' })
      return
    }
    if (!data.phone) {
      errorsCount++
      errorLog.push({ row_index: rowIndex, reason: 'Hiányzó telefonszám' })
      return
    }

    const normalized = normalizePhone(data.phone)
    if (!normalized) {
      errorsCount++
      errorLog.push({ row_index: rowIndex, reason: `Érvénytelen telefonszám: ${data.phone}` })
      return
    }

    const existing = existingMap.get(normalized)

    if (existing) {
      duplicatesCount++
      const decision = duplicate_decisions[String(rowIndex)] ?? 'skip'

      if (decision === 'skip') {
        return
      } else if (decision === 'merge') {
        const updates: Record<string, unknown> = { updated_at: now }
        if (data.name) updates.name = data.name
        if (data.email) updates.email = data.email
        if (data.address) updates.address = data.address
        if (data.city) updates.city = data.city
        if (data.postal_code) updates.postal_code = data.postal_code
        if (data.notes) updates.notes = data.notes
        if (data.last_order_at) updates.last_order_at = data.last_order_at
        if (data.preferred_payment_method) updates.preferred_payment_method = data.preferred_payment_method
        // Use higher value for order_count and total_spent
        if (data.order_count && data.order_count > (existing.order_count ?? 0)) {
          updates.order_count = data.order_count
        }
        if (data.total_spent && data.total_spent > (existing.total_spent ?? 0)) {
          updates.total_spent = data.total_spent
        }
        toMerge.push({ id: existing.id, updates })
      } else if (decision === 'keep_both') {
        // Create new record with modified phone to avoid unique violation
        const dupPhone = normalized + '_dup_' + Date.now()
        toInsert.push({
          ...data,
          phone: dupPhone,
          source: 'imported',
          imported_at: now,
          import_batch_id: importId ?? null,
          notes: `[Duplikáció-kezelés ${now}] ${data.notes ?? ''}`.trim(),
        })
      }
    } else {
      toInsert.push({
        ...data,
        phone: normalized,
        source: 'imported',
        imported_at: now,
        import_batch_id: importId ?? null,
      })
    }
  })

  // Execute inserts in batches of 100
  const insertBatches = chunk(toInsert, 100)
  for (const batch of insertBatches) {
    const { error } = await adminClient().from('customers').insert(batch)
    if (error) {
      errorLog.push({ row_index: -1, reason: `Batch insert hiba: ${error.message}` })
    } else {
      importedCount += batch.length
    }
  }

  // Execute merges
  const mergeBatches = chunk(toMerge, 100)
  for (const batch of mergeBatches) {
    for (const { id, updates } of batch) {
      const { error } = await adminClient().from('customers').update(updates).eq('id', id)
      if (error) {
        errorLog.push({ row_index: -1, reason: `Merge hiba (${id}): ${error.message}` })
      } else {
        importedCount++
      }
    }
  }

  // Update import audit record
  if (importId) {
    await adminClient()
      .from('customer_imports')
      .update({
        imported_count: importedCount,
        duplicates_count: duplicatesCount,
        errors_count: errorsCount,
        status: 'completed',
        error_log: errorLog,
        completed_at: now,
      })
      .eq('id', importId)
  }

  // Update total_customers in business_config
  const { count } = await adminClient()
    .from('customers')
    .select('*', { count: 'exact', head: true })

  if (count !== null) {
    await adminClient()
      .from('business_config')
      .update({ total_customers: count })
      .not('id', 'is', null)
  }

  return NextResponse.json({
    ok: true,
    imported: importedCount,
    duplicates: duplicatesCount,
    errors: errorsCount,
    import_id: importId,
  })
}
