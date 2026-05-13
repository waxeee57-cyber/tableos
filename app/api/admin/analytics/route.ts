import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireAdminForAPI } from '@/lib/auth'

const SUBSCRIPTION_PRICE = 59 // default monthly price in EUR/currency units

function getPeriodStart(period: string): string {
  const now = new Date()
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    case '7d':
      return new Date(Date.now() - 7 * 86400000).toISOString()
    case '30d':
      return new Date(Date.now() - 30 * 86400000).toISOString()
    case '90d':
      return new Date(Date.now() - 90 * 86400000).toISOString()
    default:
      return new Date(Date.now() - 7 * 86400000).toISOString()
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminForAPI()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '7d'
  const start = getPeriodStart(period)
  const db = adminClient()

  // Fetch orders for the period (only needed columns)
  const { data: orders } = await db
    .from('orders')
    .select('id, total, customer_id, order_type, status, payment_status, created_at, placed_at')
    .gte('created_at', start)

  const orderList = orders ?? []
  const orderIds = orderList.map((o: { id: string }) => o.id)

  // Fetch order items for top items (only for orders in period)
  const itemsPromise = orderIds.length > 0
    ? db.from('order_items').select('menu_item_id, item_name, quantity, total_price').in('order_id', orderIds)
    : Promise.resolve({ data: [] })

  // Fetch all customer first-order dates (to identify new vs repeat in period)
  const customersInPeriodPromise = db
    .from('customers')
    .select('id, created_at')
    .gte('created_at', start)

  // Reservations summary
  const reservationsPromise = db
    .from('reservations')
    .select('status')

  const [itemsRes, customersRes, reservationsRes] = await Promise.all([
    itemsPromise,
    customersInPeriodPromise,
    reservationsPromise,
  ])

  const orderItemList = (itemsRes.data ?? []) as Array<{
    menu_item_id: string | null; item_name: string; quantity: number; total_price: number
  }>
  const newCustomers = (customersRes.data ?? []) as Array<{ id: string; created_at: string }>
  const reservationList = (reservationsRes.data ?? []) as Array<{ status: string }>

  // ── Summary ──────────────────────────────────────────────────────────────────

  const totalOrders = orderList.length
  const totalRevenue = orderList.reduce((s: number, o: { total: number }) => s + (o.total ?? 0), 0)
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  const uniqueCustomerIds = new Set(
    orderList.filter((o: { customer_id: string | null }) => o.customer_id).map((o: { customer_id: string | null }) => o.customer_id)
  )
  const totalCustomers = uniqueCustomerIds.size

  const customerOrderCounts = new Map<string, number>()
  for (const o of orderList) {
    if (o.customer_id) {
      customerOrderCounts.set(o.customer_id, (customerOrderCounts.get(o.customer_id) ?? 0) + 1)
    }
  }
  const repeatCustomers = Array.from(customerOrderCounts.values()).filter((c) => c > 1).length
  const newCustomerCount = newCustomers.length

  // ── Wolt savings ─────────────────────────────────────────────────────────────

  const savedAmount = Math.round(totalRevenue * 0.27)
  const equivalentMonths = savedAmount > 0 ? parseFloat((savedAmount / SUBSCRIPTION_PRICE).toFixed(1)) : 0

  // ── Orders by day ────────────────────────────────────────────────────────────

  const dayMap = new Map<string, { count: number; revenue: number }>()
  for (const o of orderList) {
    const date = (o.placed_at ?? o.created_at ?? '').substring(0, 10)
    if (!date) continue
    const existing = dayMap.get(date) ?? { count: 0, revenue: 0 }
    dayMap.set(date, { count: existing.count + 1, revenue: existing.revenue + (o.total ?? 0) })
  }
  const ordersByDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Orders by hour ───────────────────────────────────────────────────────────

  const hourMap = new Map<number, number>()
  for (const o of orderList) {
    const ts = o.placed_at ?? o.created_at ?? ''
    if (!ts) continue
    const hour = new Date(ts).getUTCHours()
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1)
  }
  const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourMap.get(hour) ?? 0,
  }))

  // ── Orders by type ───────────────────────────────────────────────────────────

  const typeMap = new Map<string, { count: number; revenue: number }>()
  for (const o of orderList) {
    const t = (o.order_type as string) ?? 'unknown'
    const existing = typeMap.get(t) ?? { count: 0, revenue: 0 }
    typeMap.set(t, { count: existing.count + 1, revenue: existing.revenue + (o.total ?? 0) })
  }
  const ordersByType = Array.from(typeMap.entries()).map(([type, v]) => ({ type, ...v }))

  // ── Orders by status ─────────────────────────────────────────────────────────

  const statusMap = new Map<string, number>()
  for (const o of orderList) {
    const s = (o.status as string) ?? 'unknown'
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1)
  }
  const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))

  // ── Top items ────────────────────────────────────────────────────────────────

  const itemMap = new Map<string, { name: string; menu_item_id: string; quantity_sold: number; revenue: number }>()
  for (const item of orderItemList) {
    const key = item.menu_item_id ?? item.item_name
    const existing = itemMap.get(key) ?? { name: item.item_name, menu_item_id: item.menu_item_id ?? '', quantity_sold: 0, revenue: 0 }
    itemMap.set(key, {
      ...existing,
      quantity_sold: existing.quantity_sold + item.quantity,
      revenue: existing.revenue + item.total_price,
    })
  }
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, 10)

  // ── Payment breakdown ────────────────────────────────────────────────────────

  const paymentMap = new Map<string, { count: number; revenue: number }>()
  for (const o of orderList) {
    const ps = (o.payment_status as string) ?? 'unknown'
    const existing = paymentMap.get(ps) ?? { count: 0, revenue: 0 }
    paymentMap.set(ps, { count: existing.count + 1, revenue: existing.revenue + (o.total ?? 0) })
  }
  const paymentBreakdown = Array.from(paymentMap.entries()).map(([payment_status, v]) => ({ payment_status, ...v }))

  // ── Reservations summary ─────────────────────────────────────────────────────

  const resSummary = {
    total: reservationList.length,
    confirmed: reservationList.filter((r) => r.status === 'confirmed').length,
    cancelled: reservationList.filter((r) => r.status === 'cancelled').length,
    seated: reservationList.filter((r) => r.status === 'seated').length,
    pending: reservationList.filter((r) => r.status === 'pending').length,
  }

  return NextResponse.json({
    summary: {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue,
      total_customers: totalCustomers,
      new_customers: newCustomerCount,
      repeat_customers: repeatCustomers,
    },
    wolt_savings: {
      saved_amount: savedAmount,
      equivalent_months: equivalentMonths,
    },
    orders_by_day: ordersByDay,
    orders_by_hour: ordersByHour,
    orders_by_type: ordersByType,
    orders_by_status: ordersByStatus,
    top_items: topItems,
    payment_breakdown: paymentBreakdown,
    reservations_summary: resSummary,
  })
}
