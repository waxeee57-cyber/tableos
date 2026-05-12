# STATUS.md — Active Work Areas

## Claude (AI assistant) — 2026-05-12

**Branch:** `feature/manual-phone-order`
**Task:** Manual phone order entry for admin panel
**Files/areas claimed:**
- `types/index.ts` (source field on Order)
- `supabase/migrations/05_orders_source.sql`
- `app/api/admin/orders/new/route.ts`
- `app/api/admin/customers/search/route.ts`
- `app/(admin)/admin/(protected)/orders/new/page.tsx`
- `components/admin/AdminNewOrderClient.tsx`
- `components/admin/PrintReceipt.tsx`
- `components/admin/AdminOrdersClient.tsx` (new order button + source badge + keyboard shortcut)
- `app/(admin)/admin/(protected)/page.tsx` (phone order stat)

**Status:** In progress
