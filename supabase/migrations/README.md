# Migrations

Apply in order:

1. `01_schema.sql` — Core tables (already applied)
2. `02_admin_users_rls.sql` — RLS for admin_users (already applied)
3. `03_admin_policies.sql` — Admin RLS policies (already applied)
4. `04_customers_enhancements.sql` — Customer VIP/history fields + import audit table
