# STATUS.md — Active Work Areas

## Claude (AI assistant) — 2026-05-12

**Branch:** `fix/csv-import-validation`
**Task:** Full customer management system + CSV import wizard
**Files/areas claimed:**
- `types/index.ts` (Customer type extension)
- `lib/phone.ts`, `lib/date-parse.ts`, `lib/import-sessions.ts`, `lib/format.ts`
- `supabase/migrations/04_customers_enhancements.sql`
- `app/api/admin/customers/**`
- `app/(admin)/admin/(protected)/customers/**`
- `components/admin/AdminCustomersClient.tsx`, `AdminCustomerDetailClient.tsx`
- `components/admin/AdminSidebar.tsx` (add Customers nav item)
- `app/(admin)/admin/(protected)/page.tsx` (add customer stats)
- `app/api/orders/place/route.ts` (add last_order_at / source)
- `app/api/admin/orders/[id]/status/route.ts` (cancellation aggregate rollback)

**Status:** Complete — merged to feature branch, PR pending
