-- ============================================================
-- FIX: Building Progress + Photos public access (critical for mobile + logged-in users)
-- Run this in Supabase SQL Editor
--
-- Root cause of the bug:
-- - When a user is signed in, the Supabase client sends their JWT (authenticated role)
-- - building_photos and building_progress were missing GRANT SELECT for the authenticated role
-- - This caused queries to fail with permission denied for logged-in users (even though public SELECT policy existed)
-- - Result: pages fell back to hardcoded numbers + "Loading photos..." state
-- - Signing out cleared the session → worked again (anon role)
-- - Much more visible on mobile due to session persistence + bfcache
-- ============================================================

-- 1. BUILDING PHOTOS - Fix public read for both anon and authenticated
ALTER TABLE building_photos ENABLE ROW LEVEL SECURITY;

-- Ensure the public SELECT policy is explicit for anon + authenticated
DROP POLICY IF EXISTS "Public can view building photos" ON building_photos;
CREATE POLICY "Public can view building photos"
ON building_photos FOR SELECT
TO anon, authenticated
USING (true);

-- Admin management policies (keep these)
DROP POLICY IF EXISTS "Admins can insert building photos" ON building_photos;
CREATE POLICY "Admins can insert building photos"
ON building_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete building photos" ON building_photos;
CREATE POLICY "Admins can delete building photos"
ON building_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Add update for admins too (for future caption editing)
DROP POLICY IF EXISTS "Admins can update building photos" ON building_photos;
CREATE POLICY "Admins can update building photos"
ON building_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- CRITICAL GRANTS (this was the missing piece)
GRANT SELECT ON public.building_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.building_photos TO authenticated;

-- 2. BUILDING PROGRESS - Clean up duplicate policies + ensure solid public access
ALTER TABLE building_progress ENABLE ROW LEVEL SECURITY;

-- Clean, single public SELECT policy for everyone
DROP POLICY IF EXISTS "Public can view building progress" ON building_progress;
CREATE POLICY "Public can view building progress"
ON building_progress FOR SELECT
TO anon, authenticated
USING (true);

-- Remove the old duplicate authenticated update policies that were too loose
DROP POLICY IF EXISTS "Authenticated users can update building progress" ON building_progress;
DROP POLICY IF EXISTS "Authenticated users can insert building progress" ON building_progress;

-- Keep proper admin full control using is_admin()
DROP POLICY IF EXISTS "Admins can manage building progress" ON building_progress;
CREATE POLICY "Admins can manage building progress"
ON building_progress FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Grants
GRANT SELECT ON public.building_progress TO anon, authenticated;
GRANT UPDATE, INSERT ON public.building_progress TO authenticated;

-- 3. Optional: Make sure the is_admin() function exists (we created it earlier)
-- If this errors, it's fine — it means you already have it.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- After running this, the Building Project data should load reliably
-- whether the visitor is logged in or not, on desktop and mobile.
-- ============================================================