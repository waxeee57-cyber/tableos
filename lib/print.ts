import type { Order } from '@/types'

export function printOrder(order: Order): void {
  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) return
  const payLabels: Record<string, string> = {
    cash: 'Készpénz', card: 'Bankkártya',
    szep_card: 'SZÉP kártya', card_online: 'Online',
  }
  const typeLabel = order.order_type === 'delivery' ? 'Kiszállítás'
    : order.order_type === 'takeaway' ? 'Elvitel' : 'Helyi'
  win.document.write(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>#${order.order_number}</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 13px; padding: 12px; max-width: 280px; }
      h2 { font-size: 20px; margin: 0 0 6px; text-align: center; }
      .divider { border-top: 1px dashed #000; margin: 6px 0; }
      .item { margin: 3px 0; }
      .total { font-weight: bold; font-size: 15px; margin-top: 6px; text-align: right; }
      .meta { font-size: 11px; margin: 2px 0; }
      .note { background: #f5f5f5; padding: 4px; margin: 4px 0; }
      @media print { body { padding: 0; } @page { margin: 8mm; } }
    </style></head><body>
      <h2>#${order.order_number}</h2>
      <p class="meta" style="text-align:center;">${new Date(order.placed_at).toLocaleString('hu-HU')}</p>
      <p class="meta" style="text-align:center;"><strong>${typeLabel}</strong></p>
      <div class="divider"></div>
      <p class="meta"><strong>${order.customer_name}</strong></p>
      <p class="meta">Tel: ${order.customer_phone}</p>
      ${order.delivery_address ? `<p class="meta">${order.delivery_address}, ${order.delivery_city ?? ''}</p>` : ''}
      ${order.customer_notes ? `<div class="note">⚠ ${order.customer_notes}</div>` : ''}
      <div class="divider"></div>
      ${(order.order_items ?? []).map(item => `
        <div class="item">${item.quantity}× ${item.item_name}${item.item_size ? ` (${item.item_size})` : ''}</div>
      `).join('')}
      <div class="divider"></div>
      <p class="total">Összesen: ${order.total.toLocaleString('hu-HU')} Ft</p>
      <p class="meta">Fizetés: ${payLabels[order.payment_method] ?? order.payment_method}</p>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close() }, 100) }<\/script>
    </body></html>
  `)
  win.document.close()
}
