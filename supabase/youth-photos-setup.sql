-- ============================================================
-- YOUTH PHOTOS TABLE + POLICIES
-- Run this in Supabase SQL Editor (one time)
-- This makes the Youth Photos tab in Admin fully functional
-- and powers the public /youth gallery.
-- ============================================================

-- 1. Create the table (exact same structure as building_photos)
CREATE TABLE IF NOT EXISTS youth_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  uploaded_at timestamptz DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE youth_photos ENABLE ROW LEVEL SECURITY;

-- 3. Grant privileges (prevents 42501 permission denied errors)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;
GRANT SELECT ON public.youth_photos TO anon;   -- so the public youth gallery works for visitors

-- 4. Policies

-- Anyone (public + logged in) can view all youth photos (needed for the public Youth page gallery)
DROP POLICY IF EXISTS "Public can view youth photos" ON youth_photos;
CREATE POLICY "Public can view youth photos"
ON youth_photos FOR SELECT
TO anon, authenticated
USING (true);

-- Admins can insert new youth photos (via the admin drag & drop)
DROP POLICY IF EXISTS "Admins can insert youth photos" ON youth_photos;
CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Admins can delete youth photos (via the admin hover Delete button)
DROP POLICY IF EXISTS "Admins can delete youth photos" ON youth_photos;
CREATE POLICY "Admins can delete youth photos"
ON youth_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Admins can update captions if needed
DROP POLICY IF EXISTS "Admins can update youth photos" ON youth_photos;
CREATE POLICY "Admins can update youth photos"
ON youth_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================
-- IMPORTANT: You must also create the storage bucket in Supabase Dashboard:
--   1. Go to Storage → New bucket
--   2. Name it exactly: youth-photos
--   3. Make it Public (so images are viewable on the website)
--
-- After creating the bucket, the policies above + the code will allow
-- admins to upload via drag & drop in the Admin → Youth Photos tab.
-- ============================================================