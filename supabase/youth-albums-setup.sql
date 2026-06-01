-- ============================================================
-- YOUTH ALBUMS FEATURE
-- Run this after youth-photos-setup.sql
-- ============================================================

-- 1. Create albums table
CREATE TABLE IF NOT EXISTS youth_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date,
  created_at timestamptz DEFAULT now()
);

-- 2. Add album_id to existing youth_photos table
ALTER TABLE youth_photos 
ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES youth_albums(id) ON DELETE CASCADE;

-- 3. Enable RLS on new table
ALTER TABLE youth_albums ENABLE ROW LEVEL SECURITY;

-- 4. Policies for youth_albums

-- Public can view albums (needed to show on public youth page)
DROP POLICY IF EXISTS "Public can view youth albums" ON youth_albums;
CREATE POLICY "Public can view youth albums"
ON youth_albums FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can manage albums
DROP POLICY IF EXISTS "Admins can manage youth albums" ON youth_albums;
CREATE POLICY "Admins can manage youth albums"
ON youth_albums FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 5. Update policies on youth_photos to allow album_id

-- Re-apply insert policy (in case it needs refresh)
DROP POLICY IF EXISTS "Admins can insert youth photos" ON youth_photos;
CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Re-apply delete policy
DROP POLICY IF EXISTS "Admins can delete youth photos" ON youth_photos;
CREATE POLICY "Admins can delete youth photos"
ON youth_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_albums TO authenticated;

-- ============================================================
-- NOTES:
-- - Existing photos will have album_id = null (they can stay as "uncategorized" or you can assign them later)
-- - New photos should be uploaded with an album_id
-- - Deleting an album will automatically delete its photos (CASCADE)
-- ============================================================
