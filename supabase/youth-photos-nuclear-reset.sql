-- ============================================================
-- NUCLEAR RESET: youth_photos policies
-- This drops EVERY policy on the table and recreates the correct ones.
-- Run this as a last resort if the previous reset didn't work.
-- ============================================================

-- Drop all existing policies on youth_photos (no matter what they're named)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'youth_photos'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.youth_photos', pol.policyname);
    END LOOP;
END $$;

-- Recreate the correct minimal policies

-- 1. Anyone can view (required for public /youth page to work)
CREATE POLICY "Public can view youth photos"
ON youth_photos FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Only admins can insert new photos
CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- 3. Only admins can delete photos
CREATE POLICY "Admins can delete youth photos"
ON youth_photos FOR DELETE
TO authenticated
USING (is_admin());

-- 4. Only admins can update photos (e.g. change album or caption)
CREATE POLICY "Admins can update youth photos"
ON youth_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Make sure the right privileges are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;

-- Optional: Confirm the policies were created
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'youth_photos';
