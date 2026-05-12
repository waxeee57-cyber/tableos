import { NextRequest, NextResponse } from 'next/server'
import { requireAdminForAPI } from '@/lib/auth'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { createImportSession } from '@/lib/import-sessions'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const allRows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field)
        field = ''
      } else if (ch === '\r' && next === '\n') {
        current.push(field)
        if (current.some((f) => f.trim().length > 0)) allRows.push(current)
        current = []
        field = ''
        i++
      } else if (ch === '\n' || ch === '\r') {
        current.push(field)
        if (current.some((f) => f.trim().length > 0)) allRows.push(current)
        current = []
        field = ''
      } else {
        field += ch
      }
    }
  }

  if (current.length > 0 || field.length > 0) {
    current.push(field)
    if (current.some((f) => f.trim().length > 0)) allRows.push(current)
  }

  if (allRows.length === 0) return { headers: [], rows: [] }
  return { headers: allRows[0].map((h) => h.trim()), rows: allRows.slice(1) }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIP(request)
  if (!await rateLimit(`import-parse:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Túl sok feltöltési kísérlet. Próbáld egy óra múlva.' }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Fájl nem található.' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'A fájl túl nagy. Maximum 5 MB.' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json({ error: 'Csak .csv fájl fogadható el.' }, { status: 400 })
  }

  const text = await file.text()
  const { headers, rows } = parseCSVText(text)

  if (headers.length === 0) {
    return NextResponse.json({ error: 'A fájl üres vagy nem olvasható.' }, { status: 400 })
  }

  const session_id = await createImportSession(headers, rows, rows.length)

  return NextResponse.json({
    columns: headers,
    rows: rows.slice(0, 100),
    total_rows: rows.length,
    session_id,
    filename: file.name,
  })
}
