-- ============================================================
-- FIX BUILDING PROGRESS PUBLIC READ ACCESS
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.building_progress ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old/conflicting policies so we start clean
DROP POLICY IF EXISTS "Public can view building progress" ON public.building_progress;
DROP POLICY IF EXISTS "Public can view building progress" ON public.building_progress; -- in case of duplicates
DROP POLICY IF EXISTS "Authenticated users can update building progress" ON public.building_progress;
DROP POLICY IF EXISTS "Authenticated users can insert building progress" ON public.building_progress;
DROP POLICY IF EXISTS "Admins can manage building progress" ON public.building_progress;

-- 3. Create a clean public SELECT policy (anyone can read)
CREATE POLICY "Public can view building progress"
ON public.building_progress
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Admin-only management (using your existing is_admin() function)
CREATE POLICY "Admins can manage building progress"
ON public.building_progress
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 5. Critical: Grant SELECT to anonymous users
-- Without this, even with a policy, anon role cannot read the table.
GRANT SELECT ON public.building_progress TO anon;
GRANT SELECT ON public.building_progress TO authenticated;

-- Optional: Allow authenticated users to update (admin UI still gates it)
GRANT UPDATE, INSERT ON public.building_progress TO authenticated;

-- 6. Quick verification query
SELECT * FROM public.building_progress WHERE id = 1;

-- After running this, hard refresh the Building Project page while signed out.
-- The numbers should now match what the admin enters.