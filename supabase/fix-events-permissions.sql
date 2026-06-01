-- ============================================================
-- Fix permissions for the events table (admin insert/update/delete)
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- 1. Create the admin management policy (if it doesn't exist)
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Admins can manage events"
ON public.events
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 2. Grant the necessary privileges to authenticated users
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;

-- 3. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Verification - run this after to confirm
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'events' 
  AND table_schema = 'public'
  AND grantee IN ('anon', 'authenticated');

SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'events';
