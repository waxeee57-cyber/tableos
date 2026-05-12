export function normalizePhone(input: string): string | null {
  if (!input) return null

  let digits = input.replace(/\D/g, '')

  if (digits.startsWith('00')) digits = digits.substring(2)
  if (digits.startsWith('36') && digits.length >= 11) {
    return '+' + digits
  }
  if (digits.startsWith('06') && digits.length >= 11) {
    return '+36' + digits.substring(2)
  }
  if (digits.length === 9 || digits.length === 10) {
    return '+36' + digits
  }

  return null
}

export function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input)
  if (!normalized) return false
  return /^\+36\d{9}$/.test(normalized)
}
