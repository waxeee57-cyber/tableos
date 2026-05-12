-- Fix: RLS policies for admin_users
--
-- 01_schema.sql enables RLS on admin_users but defines zero policies.
-- Postgres denies all access when RLS is on with no matching policy,
-- so requireAdmin() could never read the row that confirms admin access,
-- causing every login attempt to silently redirect back to /admin/login.
--
-- Run on the live Supabase project via the SQL editor or CLI.

-- Allow an authenticated user to read their own admin_users row.
-- Required by requireAdmin() in lib/auth.ts which calls:
--   supabase.from('admin_users').select('*').eq('user_id', user.id).single()
CREATE POLICY "Admin users can read own record"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated admins to manage all admin rows (for future
-- admin-management UI: invite new staff, change roles, revoke access).
-- Restricted to users who already have a row in admin_users.
CREATE POLICY "Admin users can manage all admin records"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users self
      WHERE self.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users self
      WHERE self.user_id = auth.uid()
    )
  );
