-- ============================================================
-- MAKE YOUTH PHOTOS WORK LIKE BUILDING PHOTOS
-- 
-- Run this in Supabase SQL Editor.
-- This applies the EXACT same policy + grant pattern that makes
-- building_photos uploads work from the admin.
-- ============================================================

-- 1. Re-create is_admin() cleanly (this is critical)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 2. Apply the same policies as building_photos
ALTER TABLE youth_photos ENABLE ROW LEVEL SECURITY;

-- Public can view (needed for the public Youth page)
DROP POLICY IF EXISTS "Public can view youth photos" ON youth_photos;
CREATE POLICY "Public can view youth photos"
ON youth_photos FOR SELECT
TO anon, authenticated
USING (true);

-- Admins can insert (same as building)
DROP POLICY IF EXISTS "Admins can insert youth photos" ON youth_photos;
CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Admins can delete
DROP POLICY IF EXISTS "Admins can delete youth photos" ON youth_photos;
CREATE POLICY "Admins can delete youth photos"
ON youth_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Admins can update (for captions etc.)
DROP POLICY IF EXISTS "Admins can update youth photos" ON youth_photos;
CREATE POLICY "Admins can update youth photos"
ON youth_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 3. Critical grants (this was often the missing piece for building too)
GRANT SELECT ON public.youth_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;

-- ============================================================
-- After running this:
-- 1. Hard refresh your admin page
-- 2. Try uploading a youth photo using the exact same drag/drop as Building
--
-- It should now behave identically to building_photos.
-- ============================================================