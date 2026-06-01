-- ============================================================
-- FIX YOUTH STORAGE BUCKET POLICIES (to match Building)
--
-- The table policies are now aligned, but Storage uploads are
-- controlled by RLS on the storage.objects table.
-- This is very likely why youth uploads still fail with RLS
-- while building uploads succeed.
-- ============================================================

-- 1. Show current storage policies for both buckets (run this first to compare)
SELECT 
  policyname,
  cmd,
  bucket_id,
  qual,
  with_check
FROM storage.policies
WHERE bucket_id IN ('building-photos', 'youth-photos')
ORDER BY bucket_id, policyname;

-- ============================================================
-- 2. Apply matching storage policies for youth-photos
--    (same pattern that allows admins to upload to building-photos)
-- ============================================================

-- Allow public read of youth photos (needed for the public page)
DROP POLICY IF EXISTS "Public can view youth photos" ON storage.objects;
CREATE POLICY "Public can view youth photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'youth-photos');

-- Allow admins to upload (INSERT) into youth-photos bucket
DROP POLICY IF EXISTS "Admins can upload to youth-photos" ON storage.objects;
CREATE POLICY "Admins can upload to youth-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'youth-photos'
  AND is_admin()
);

-- Allow admins to delete from youth-photos bucket
DROP POLICY IF EXISTS "Admins can delete from youth-photos" ON storage.objects;
CREATE POLICY "Admins can delete from youth-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'youth-photos'
  AND is_admin()
);

-- Allow admins to update (if needed for future)
DROP POLICY IF EXISTS "Admins can update youth-photos" ON storage.objects;
CREATE POLICY "Admins can update youth-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'youth-photos'
  AND is_admin()
)
WITH CHECK (
  bucket_id = 'youth-photos'
  AND is_admin()
);

-- ============================================================
-- After running the above:
-- 1. Hard refresh the admin page (Cmd/Ctrl + Shift + R)
-- 2. Try uploading again using the same flow as Building photos
--
-- If it still fails, copy the output of the SELECT query above
-- (the comparison of the two buckets) and send it here.
-- ============================================================