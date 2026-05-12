import { adminClient } from '@/lib/supabase/admin'

export interface ImportSession {
  columns: string[]
  rows: string[][]
  total_rows: number
  created_at: number
}

const SESSION_TTL_MS = 30 * 60 * 1000

export async function createImportSession(
  columns: string[],
  rows: string[][],
  total_rows: number
): Promise<string> {
  await adminClient()
    .from('import_sessions')
    .delete()
    .lt('created_at', new Date(Date.now() - SESSION_TTL_MS).toISOString())

  const id = crypto.randomUUID()
  await adminClient()
    .from('import_sessions')
    .insert({ id, data: { columns, rows, total_rows }, created_at: new Date().toISOString() })

  return id
}

export async function getImportSession(id: string): Promise<ImportSession | null> {
  const { data } = await adminClient()
    .from('import_sessions')
    .select('data, created_at')
    .eq('id', id)
    .gt('created_at', new Date(Date.now() - SESSION_TTL_MS).toISOString())
    .maybeSingle()

  if (!data) return null

  const d = data.data as { columns: string[]; rows: string[][]; total_rows: number }
  return {
    columns: d.columns,
    rows: d.rows,
    total_rows: d.total_rows,
    created_at: new Date(data.created_at as string).getTime(),
  }
}
