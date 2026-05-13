import type { Order, OrderItem, BusinessConfig, Reservation } from '@/types'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function baseTemplate(content: string, config: Partial<BusinessConfig>): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(config.business_name ?? 'TableOS')}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; color: #333; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: ${config.primary_color ?? '#E85D04'}; padding: 24px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 24px; }
  .body { padding: 32px 24px; }
  .footer { background: #f5f5f5; padding: 16px 24px; text-align: center; font-size: 13px; color: #888; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { text-align: left; padding: 8px; border-bottom: 2px solid #eee; font-size: 13px; color: #888; }
  td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
  .total-row td { font-weight: bold; border-top: 2px solid #eee; border-bottom: none; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${config.primary_color ?? '#E85D04'}; color: #fff; font-size: 14px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${esc(config.business_name ?? 'TableOS')}</h1></div>
  <div class="body">${content}</div>
  <div class="footer">
    ${esc(config.business_name ?? 'TableOS')}${config.phone ? ` · ${esc(config.phone)}` : ''}
  </div>
</div>
</body>
</html>`
}

function itemsTable(items: OrderItem[], deliveryFee: number, total: number, currency: string, symbol: string): string {
  const fmt = (n: number) => currency === 'HUF'
    ? `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${esc(symbol)}`
    : `${esc(symbol)}${(n / 100).toFixed(2)}`

  const rows = items.map(i => `
    <tr>
      <td>${esc(i.item_name)}${i.item_size ? ` (${esc(i.item_size)})` : ''}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${fmt(i.total_price)}</td>
    </tr>`).join('')

  return `<table>
    <thead><tr><th>Tétel</th><th style="text-align:center">Db</th><th style="text-align:right">Ár</th></tr></thead>
    <tbody>
      ${rows}
      ${deliveryFee > 0 ? `<tr><td>Kiszállítási díj</td><td></td><td style="text-align:right">${fmt(deliveryFee)}</td></tr>` : ''}
    </tbody>
    <tfoot><tr class="total-row"><td colspan="2">Összesen</td><td style="text-align:right">${fmt(total)}</td></tr></tfoot>
  </table>`
}

function formatScheduledFor(isoString: string, timezone: string): string {
  const d = new Date(isoString)
  const datePart = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'short', day: 'numeric' }).format(d)
  const timePart = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return `${datePart}, ${timePart}`
}

export function orderConfirmationEmail(
  order: Order,
  items: OrderItem[],
  config: BusinessConfig
): { subject: string; html: string } {
  const subject = `Rendelésed megérkezett — #${esc(order.order_number)}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const trackingUrl = `${siteUrl}/order/${order.id}`
  const typeLabel = order.order_type === 'delivery' ? 'Kiszállítás' : order.order_type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás'

  const scheduledLine = order.is_scheduled && order.scheduled_for
    ? `<p><strong>Scheduled for:</strong> ${esc(formatScheduledFor(order.scheduled_for, config.timezone))}</p>`
    : ''

  const content = `
    <h2>Köszönjük a rendelésed!</h2>
    <p>Rendelésszám: <span class="badge">#${esc(order.order_number)}</span></p>
    <p><strong>Típus:</strong> ${esc(typeLabel)}</p>
    ${scheduledLine}
    ${itemsTable(items, order.delivery_fee, order.total, config.currency, config.currency_symbol)}
    ${order.order_type === 'delivery' ? `
    <p><strong>Kiszállítási cím:</strong><br>
    ${esc(order.delivery_address ?? '')}, ${esc(order.delivery_city ?? '')}</p>
    <p><strong>Becsült kiszállítás:</strong> ~${config.estimated_delivery_minutes} perc</p>` : ''}
    <p style="margin-top:24px">
      <a href="${trackingUrl}" style="background:${config.primary_color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        Rendelés követése →
      </a>
    </p>`

  return { subject, html: baseTemplate(content, config) }
}

export function newOrderAdminEmail(
  order: Order,
  items: OrderItem[],
  config: BusinessConfig
): { subject: string; html: string } {
  const subject = `Új rendelés — #${esc(order.order_number)} — ${order.total} ${esc(config.currency_symbol)}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const adminUrl = `${siteUrl}/admin/orders`
  const typeLabel = order.order_type === 'delivery' ? 'Kiszállítás' : order.order_type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás'

  const scheduledLine = order.is_scheduled && order.scheduled_for
    ? `<p><strong>Scheduled for:</strong> ${esc(formatScheduledFor(order.scheduled_for, config.timezone))}</p>`
    : ''

  const content = `
    <h2>Új rendelés érkezett!</h2>
    <p>Rendelésszám: <span class="badge">#${esc(order.order_number)}</span></p>
    <p><strong>Típus:</strong> ${esc(typeLabel)} · <strong>Fizetés:</strong> ${esc(order.payment_method)}</p>
    ${scheduledLine}
    <p><strong>Ügyfél:</strong> ${esc(order.customer_name)} · ${esc(order.customer_phone)}
    ${order.customer_email ? ` · ${esc(order.customer_email)}` : ''}</p>
    ${order.order_type === 'delivery' ? `<p><strong>Cím:</strong> ${esc(order.delivery_address ?? '')}, ${esc(order.delivery_city ?? '')}</p>` : ''}
    ${order.customer_notes ? `<p><strong>Megjegyzés:</strong> ${esc(order.customer_notes)}</p>` : ''}
    ${itemsTable(items, order.delivery_fee, order.total, config.currency, config.currency_symbol)}
    <p style="margin-top:24px">
      <a href="${adminUrl}" style="background:${config.primary_color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        Admin panel →
      </a>
    </p>`

  return { subject, html: baseTemplate(content, config) }
}

export function orderStatusUpdateEmail(
  order: Order,
  config: BusinessConfig
): { subject: string; html: string } {
  const subject = `Rendelésed állapota frissült — #${esc(order.order_number)}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const trackingUrl = `${siteUrl}/order/${order.id}`

  const statusLabels: Record<string, string> = {
    accepted: 'Elfogadva',
    preparing: 'Készítés alatt',
    ready: 'Kész',
    delivering: 'Kiszállítás alatt',
    completed: 'Teljesítve',
    cancelled: 'Lemondva',
    rejected: 'Elutasítva',
  }

  const label = statusLabels[order.status] ?? order.status

  const content = `
    <h2>Rendelésed állapota megváltozott</h2>
    <p>Rendelésszám: <span class="badge">#${esc(order.order_number)}</span></p>
    <p>Jelenlegi állapot: <strong>${esc(label)}</strong></p>
    <p style="margin-top:24px">
      <a href="${trackingUrl}" style="background:${config.primary_color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        Rendelés megtekintése →
      </a>
    </p>`

  return { subject, html: baseTemplate(content, config) }
}

export function reservationConfirmationEmail(
  reservation: Reservation,
  config: BusinessConfig
): { subject: string; html: string } {
  const subject = `Foglalás visszaigazolás — ${esc(reservation.customer_name)}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const time = reservation.reservation_time.substring(0, 5)

  const dateFormatted = new Intl.DateTimeFormat('hu-HU', {
    timeZone: config.timezone,
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(`${reservation.reservation_date}T${reservation.reservation_time}`))

  const preOrderSection = config.dine_in_enabled
    ? `<p style="margin-top:24px">Szeretne előre rendelni? <a href="${siteUrl}/reserve/${reservation.id}/order" style="background:${config.primary_color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Előrendelés →</a></p>`
    : ''

  const content = `
    <h2>Köszönjük a foglalást!</h2>
    <p><strong>Dátum:</strong> ${esc(dateFormatted)}</p>
    <p><strong>Időpont:</strong> ${esc(time)}</p>
    <p><strong>Személyek száma:</strong> ${reservation.party_size} fő</p>
    ${reservation.notes ? `<p><strong>Megjegyzés:</strong> ${esc(reservation.notes)}</p>` : ''}
    <p>Hamarosan visszaigazoljuk a foglalását.</p>
    ${preOrderSection}`

  return { subject, html: baseTemplate(content, config) }
}

export function newReservationAdminEmail(
  reservation: Reservation,
  config: BusinessConfig
): { subject: string; html: string } {
  const subject = `Új foglalás — ${esc(reservation.customer_name)} — ${reservation.reservation_date}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const adminUrl = `${siteUrl}/admin/reservations`
  const time = reservation.reservation_time.substring(0, 5)

  const content = `
    <h2>Új foglalási igény érkezett!</h2>
    <p><strong>Dátum:</strong> ${esc(reservation.reservation_date)}</p>
    <p><strong>Időpont:</strong> ${esc(time)}</p>
    <p><strong>Személyek száma:</strong> ${reservation.party_size} fő</p>
    <p><strong>Vendég:</strong> ${esc(reservation.customer_name)} · ${esc(reservation.customer_phone)}${reservation.customer_email ? ` · ${esc(reservation.customer_email)}` : ''}</p>
    ${reservation.notes ? `<p><strong>Megjegyzés:</strong> ${esc(reservation.notes)}</p>` : ''}
    <p style="margin-top:24px">
      <a href="${adminUrl}" style="background:${config.primary_color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        Admin panel →
      </a>
    </p>`

  return { subject, html: baseTemplate(content, config) }
}

export function reservationStatusEmail(
  reservation: Reservation,
  config: BusinessConfig
): { subject: string; html: string } {
  const isConfirmed = reservation.status === 'confirmed'
  const subject = isConfirmed
    ? `Foglalás visszaigazolva — ${esc(reservation.customer_name)}`
    : `Foglalás lemondva — ${esc(reservation.customer_name)}`

  const time = reservation.reservation_time.substring(0, 5)

  const content = `
    <h2>${isConfirmed ? 'Foglalása visszaigazolva!' : 'Foglalása lemondva'}</h2>
    <p><strong>Dátum:</strong> ${esc(reservation.reservation_date)}</p>
    <p><strong>Időpont:</strong> ${esc(time)}</p>
    <p><strong>Személyek száma:</strong> ${reservation.party_size} fő</p>
    ${isConfirmed
      ? `<p>Várjuk szeretettel!</p>`
      : `<p>Sajnáljuk, hogy nem tud eljönni. Reméljük hamarosan viszontlátjuk!</p>`
    }`

  return { subject, html: baseTemplate(content, config) }
}
