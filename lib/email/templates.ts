import type { Order, OrderItem, BusinessConfig } from '@/types'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

function baseTemplate(content: string, config: Partial<BusinessConfig>): string {
  const brandColor = HEX_COLOR_RE.test(config.primary_color ?? '') ? config.primary_color! : '#E85D04'
  return `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${config.business_name ?? 'TableOS'}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; color: #333; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: ${brandColor}; padding: 24px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 24px; }
  .body { padding: 32px 24px; }
  .footer { background: #f5f5f5; padding: 16px 24px; text-align: center; font-size: 13px; color: #888; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { text-align: left; padding: 8px; border-bottom: 2px solid #eee; font-size: 13px; color: #888; }
  td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
  .total-row td { font-weight: bold; border-top: 2px solid #eee; border-bottom: none; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${brandColor}; color: #fff; font-size: 14px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${config.business_name ?? 'TableOS'}</h1></div>
  <div class="body">${content}</div>
  <div class="footer">
    ${config.business_name ?? 'TableOS'}${config.phone ? ` · ${config.phone}` : ''}
  </div>
</div>
</body>
</html>`
}

function itemsTable(items: OrderItem[], deliveryFee: number, total: number, currency: string, symbol: string): string {
  const fmt = (n: number) => currency === 'HUF'
    ? `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${symbol}`
    : `${symbol}${(n / 100).toFixed(2)}`

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

export function orderConfirmationEmail(
  order: Order,
  items: OrderItem[],
  config: BusinessConfig
): { subject: string; html: string } {
  const subject = `Rendelésed megérkezett — #${order.order_number}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const trackingUrl = `${siteUrl}/order/${order.id}`
  const typeLabel = order.order_type === 'delivery' ? 'Kiszállítás' : order.order_type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás'

  const content = `
    <h2>Köszönjük a rendelésed!</h2>
    <p>Rendelésszám: <span class="badge">#${order.order_number}</span></p>
    <p><strong>Típus:</strong> ${typeLabel}</p>
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
  const subject = `Új rendelés — #${order.order_number} — ${order.total} ${config.currency_symbol}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const adminUrl = `${siteUrl}/admin/orders`
  const typeLabel = order.order_type === 'delivery' ? 'Kiszállítás' : order.order_type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás'

  const content = `
    <h2>Új rendelés érkezett!</h2>
    <p>Rendelésszám: <span class="badge">#${order.order_number}</span></p>
    <p><strong>Típus:</strong> ${typeLabel} · <strong>Fizetés:</strong> ${order.payment_method}</p>
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
  const subject = `Rendelésed állapota frissült — #${order.order_number}`
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
    <p>Rendelésszám: <span class="badge">#${order.order_number}</span></p>
    <p>Jelenlegi állapot: <strong>${label}</strong></p>
    <p style="margin-top:24px">
      <a href="${trackingUrl}" style="background:${config.primary_color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">
        Rendelés megtekintése →
      </a>
    </p>`

  return { subject, html: baseTemplate(content, config) }
}
