import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

const RowSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  size1: z.string().optional().default(''),
  price1: z.string().min(1),
  size2: z.string().optional().default(''),
  price2: z.string().optional().default(''),
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote inside a quoted field ("" → ")
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current.trim())
    rows.push(cells)
  }

  return rows
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIP(request)
  if (!rateLimit(`import:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Túl sok import. Próbáld egy óra múlva.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { csv } = body as { csv?: string }
  if (!csv) return NextResponse.json({ error: 'No CSV data' }, { status: 400 })

  const lines = parseCSV(csv)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })

  const dataRows = lines.slice(1)
  const errors: { row: number; error: string }[] = []
  const items: Array<{
    category: string
    name: string
    description: string
    prices: Array<{ size: string | null; price: number }>
  }> = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const obj = {
      category: row[0] ?? '',
      name: row[1] ?? '',
      description: row[2] ?? '',
      size1: row[3] ?? '',
      price1: row[4] ?? '',
      size2: row[5] ?? '',
      price2: row[6] ?? '',
    }

    const parsed = RowSchema.safeParse(obj)
    if (!parsed.success) {
      errors.push({ row: i + 2, error: parsed.error.issues[0]?.message ?? 'Invalid row' })
      continue
    }

    const d = parsed.data
    const prices: Array<{ size: string | null; price: number }> = []
    const p1 = parseInt(d.price1, 10)
    if (isNaN(p1)) { errors.push({ row: i + 2, error: 'Érvénytelen ár' }); continue }
    prices.push({ size: d.size1 || null, price: p1 })
    if (d.price2) {
      const p2 = parseInt(d.price2, 10)
      if (!isNaN(p2)) prices.push({ size: d.size2 || null, price: p2 })
    }
    items.push({ category: d.category, name: d.name, description: d.description, prices })
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 })
  }

  const categoryNames = [...new Set(items.map((i) => i.category))]
  const categoryMap = new Map<string, string>()

  for (const catName of categoryNames) {
    const slug = slugify(catName)
    const { data: existing } = await adminClient().from('menu_categories').select('id').eq('slug', slug).single()
    if (existing) {
      categoryMap.set(catName, existing.id)
    } else {
      const { data: created } = await adminClient().from('menu_categories').insert({ name: catName, slug }).select('id').single()
      if (created) categoryMap.set(catName, created.id)
    }
  }

  let inserted = 0
  for (const item of items) {
    const categoryId = categoryMap.get(item.category)
    if (!categoryId) continue

    let slug = slugify(item.name)
    const { data: existingItem } = await adminClient().from('menu_items').select('id').eq('slug', slug).single()
    if (existingItem) slug = `${slug}-${Date.now()}`

    await adminClient().from('menu_items').insert({
      category_id: categoryId,
      name: item.name,
      slug,
      description: item.description || null,
      prices: item.prices,
    })
    inserted++
  }

  return NextResponse.json({ success: true, inserted, total: items.length })
}
