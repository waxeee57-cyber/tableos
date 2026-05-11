export function formatPrice(amount: number, currency = 'HUF', symbol = 'Ft'): string {
  if (currency === 'HUF') {
    const formatted = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} ${symbol}`
  }
  // EUR and others: symbol prefix, 2 decimal places
  return `${symbol}${(amount / 100).toFixed(2)}`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d)} ${formatTime(d)}`
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)

  if (seconds < 60) return `${seconds} másodperce`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} perce`
  const hours = Math.floor(minutes / 60)
  return `${hours} órája`
}
