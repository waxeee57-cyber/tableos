export function parseImportDate(input: string): string | null {
  if (!input || typeof input !== 'string') return null

  const trimmed = input.trim()
  if (!trimmed) return null

  // Try ISO format first (handles YYYY-MM-DD and YYYY-MM-DD HH:MM:SS)
  const iso = new Date(trimmed)
  if (!isNaN(iso.getTime())) return iso.toISOString()

  // Try European DD/MM/YYYY or DD.MM.YYYY
  const euMatch = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (euMatch) {
    const [, day, month, year] = euMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (!isNaN(date.getTime())) return date.toISOString()
  }

  return null
}
