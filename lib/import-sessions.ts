import { adminClient } from '@/lib/supabase/admin'

export interface ImportSession {
  columns: string[]
  rows: string[][]
  total_rows: number
  created_at: number
}

const TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function createImportSession(
  columns: string[],
  rows: string[][],
  total_rows: number
): Promise<string> {
  // Delete expired sessions on write to keep the table small
  const expiry = new Date(Date.now() - TTL_MS).toISOString()
  await adminClient().from('import_sessions').delete().lt('created_at', expiry)

  const { data, error } = await adminClient()
    .from('import_sessions')
    .insert({ data: { columns, rows, total_rows } })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create import session')
  return data.id as string
}

export async function getImportSession(id: string): Promise<ImportSession | null> {
  const expiry = new Date(Date.now() - TTL_MS).toISOString()

  // Delete expired sessions on read
  await adminClient().from('import_sessions').delete().lt('created_at', expiry)

  const { data } = await adminClient()
    .from('import_sessions')
    .select('data, created_at')
    .eq('id', id)
    .single()

  if (!data) return null

  const payload = data.data as { columns: string[]; rows: string[][]; total_rows: number }
  return {
    ...payload,
    created_at: new Date(data.created_at as string).getTime(),
  }
}
