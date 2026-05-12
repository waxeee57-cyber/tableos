export interface ImportSession {
  columns: string[]
  rows: string[][]
  total_rows: number
  created_at: number
}

const sessions = new Map<string, ImportSession>()

function cleanup() {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.created_at > 60 * 60 * 1000) {
      sessions.delete(id)
    }
  }
}

export function createImportSession(columns: string[], rows: string[][], total_rows: number): string {
  cleanup()
  const id = crypto.randomUUID()
  sessions.set(id, { columns, rows, total_rows, created_at: Date.now() })
  return id
}

export function getImportSession(id: string): ImportSession | null {
  const session = sessions.get(id)
  if (!session) return null
  if (Date.now() - session.created_at > 60 * 60 * 1000) {
    sessions.delete(id)
    return null
  }
  return session
}
