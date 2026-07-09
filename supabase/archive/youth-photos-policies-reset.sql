-- ============================================================
-- FORCE RESET POLICIES FOR YOUTH_PHOTOS
-- Run this if you're getting RLS errors on insert even as admin
-- ============================================================

-- Drop existing policies (safe if they don't exist)
DROP POLICY IF EXISTS "Public can view youth photos" ON youth_photos;
DROP POLICY IF EXISTS "Admins can insert youth photos" ON youth_photos;
DROP POLICY IF EXISTS "Admins can delete youth photos" ON youth_photos;
DROP POLICY IF EXISTS "Admins can update youth photos" ON youth_photos;

-- Recreate clean policies

-- Anyone can view (needed for public /youth page)
CREATE POLICY "Public can view youth photos"
ON youth_photos FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can delete
CREATE POLICY "Admins can delete youth photos"
ON youth_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Only admins can update (e.g. change caption or album)
CREATE POLICY "Admins can update youth photos"
ON youth_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Make sure privileges are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;
