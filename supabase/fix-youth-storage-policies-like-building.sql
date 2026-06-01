-- ============================================================
-- FIX YOUTH STORAGE BUCKET POLICIES (to match Building)
--
-- NOTE: The previous version used "storage.policies" which does not
-- exist in your Supabase version. This is the corrected script.
-- ============================================================

-- 1. Inspect current storage policies for objects (correct way)
-- Run this to see what policies exist for both buckets
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    qual LIKE '%youth-photos%' 
    OR with_check LIKE '%youth-photos%'
    OR qual LIKE '%building-photos%'
    OR with_check LIKE '%building-photos%'
  )
ORDER BY policyname;

-- Alternative: Show ALL storage object policies so you can compare manually
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;

-- ============================================================
-- 2. Apply the correct storage policies for youth-photos
--    (matching the pattern that works for building-photos)
-- ============================================================

-- Public read access to youth photos (required for the public Youth page)
DROP POLICY IF EXISTS "Public can view youth photos" ON storage.objects;
CREATE POLICY "Public can view youth photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'youth-photos');

-- Admins can upload new files to the youth-photos bucket
DROP POLICY IF EXISTS "Admins can upload to youth-photos" ON storage.objects;
CREATE POLICY "Admins can upload to youth-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'youth-photos' 
  AND is_admin()
);

-- Admins can delete files from the youth-photos bucket
DROP POLICY IF EXISTS "Admins can delete from youth-photos" ON storage.objects;
CREATE POLICY "Admins can delete from youth-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'youth-photos' 
  AND is_admin()
);

-- Admins can update files (optional, for future use)
DROP POLICY IF EXISTS "Admins can update in youth-photos" ON storage.objects;
CREATE POLICY "Admins can update in youth-photos"
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
-- After running this script:
-- 1. Hard refresh the admin page (Cmd/Ctrl + Shift + R)
-- 2. Try uploading a youth photo using the exact same method as Building photos
--
-- Paste the output of the first SELECT query here if it still fails.
-- ============================================================