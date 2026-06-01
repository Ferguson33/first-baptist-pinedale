-- ============================================================
-- Fix admin permissions for the events table
-- This is the usual culprit when you get "permission denied" from the admin
-- even though the policy looks like it exists.
-- ============================================================

-- 1. Recreate is_admin() with the correct SECURITY DEFINER + search_path
--    (this is the version that has worked reliably in the past)
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

-- 2. Re-apply the admin management policy cleanly
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Admins can manage events"
ON public.events
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 3. Make sure authenticated users have the grants
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;

-- 4. Reload PostgREST cache
NOTIFY pgrst, 'reload schema';

-- 5. Quick check (run this and look at the output)
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'events';

-- Also confirm your own profile has role = 'admin'
SELECT id, full_name, role 
FROM public.profiles 
WHERE id = auth.uid();