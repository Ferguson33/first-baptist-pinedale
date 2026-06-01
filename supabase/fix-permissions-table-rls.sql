-- ============================================================
-- FIX RLS + PERMISSIONS FOR THE "permissions" TABLE
-- Same pattern that finally stabilized events, youth photos, building, etc.
--
-- Run this ENTIRE file in the Supabase SQL Editor (as the project owner).
-- Then hard refresh your admin page and test the operation again.
-- ============================================================

-- 1. Make sure the table exists (safe if it already does).
--    If this errors, tell me the exact table name and its columns.
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add your real columns here once confirmed, e.g.:
  -- name text NOT NULL,
  -- action text NOT NULL,
  -- resource text,
  -- created_at timestamptz DEFAULT now(),
  -- updated_at timestamptz DEFAULT now()
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (required)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- 2. Recreate the is_admin() helper (the version that has been most reliable)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Clean old policies on this table (safe)
DROP POLICY IF EXISTS "Public can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "permissions_select_public" ON public.permissions;
DROP POLICY IF EXISTS "permissions_admin_all" ON public.permissions;
DROP POLICY IF EXISTS "allow_public_read_permissions" ON public.permissions;
DROP POLICY IF EXISTS "allow_admin_manage_permissions" ON public.permissions;

-- 4. Public read policy (the one that stopped 401s on public pages)
--    Using TO public + USING (true) is the pattern that worked for events.
CREATE POLICY "Public can view permissions"
ON public.permissions
FOR SELECT
TO public
USING (true);

-- 5. Admin full control (insert/update/delete/select) via the SECURITY DEFINER function
--    This avoids JWT/role drift problems.
CREATE POLICY "Admins can manage permissions"
ON public.permissions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 6. Critical GRANTs (this was the missing piece on many tables)
--    Without these you get 42501 "permission denied" even with good policies.
GRANT SELECT ON public.permissions TO anon;
GRANT SELECT ON public.permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.permissions TO authenticated;

-- 7. Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFICATION QUERIES (run these and paste the output back)
-- ============================================================

-- Show current policies on the permissions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'permissions'
ORDER BY policyname;

-- Confirm your own account is admin (this must return 'admin')
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE id = auth.uid();

-- Quick test: can the current user see rows? (should not error)
SELECT count(*) FROM public.permissions;

-- If you get any error from the queries above, paste the full error here.
