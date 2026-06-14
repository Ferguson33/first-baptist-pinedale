-- ============================================================
-- FIX & ENHANCE YOUTH MINISTRY: Public visibility + stability
-- Run this in Supabase SQL Editor to ensure:
--   - /youth and /youth-ministry pages work for ALL visitors (no login)
--   - Albums, photos, youth_events are publicly readable (anon)
--   - Admin (any admin via is_admin()) can fully manage
--   - Grants to prevent 42501 permission denied
--   - Reload schema cache
-- ============================================================

-- 0. Ensure is_admin() exists and is correct (any admin, not name-specific)
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

-- 1. Ensure youth_events table + public read + admin manage (any admin)
CREATE TABLE IF NOT EXISTS youth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date,
  description text,
  image_url text,
  link_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE youth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view youth events" ON youth_events;
CREATE POLICY "Public can view youth events"
ON youth_events FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage youth events" ON youth_events;
CREATE POLICY "Admins can manage youth events"
ON youth_events FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT ON public.youth_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_events TO authenticated;

-- 2. Ensure youth_albums table + public read + admin manage
CREATE TABLE IF NOT EXISTS youth_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE youth_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view youth albums" ON youth_albums;
CREATE POLICY "Public can view youth albums"
ON youth_albums FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage youth albums" ON youth_albums;
CREATE POLICY "Admins can manage youth albums"
ON youth_albums FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_albums TO authenticated;
GRANT SELECT ON public.youth_albums TO anon;

-- 3. Ensure youth_photos table + public read (for albums/gallery) + admin manage
CREATE TABLE IF NOT EXISTS youth_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  album_id uuid REFERENCES youth_albums(id) ON DELETE CASCADE,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE youth_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view youth photos" ON youth_photos;
CREATE POLICY "Public can view youth photos"
ON youth_photos FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert youth photos" ON youth_photos;
CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete youth photos" ON youth_photos;
CREATE POLICY "Admins can delete youth photos"
ON youth_photos FOR DELETE
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "Admins can update youth photos" ON youth_photos;
CREATE POLICY "Admins can update youth photos"
ON youth_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT ON public.youth_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;

-- 4. Ensure sermon_settings public SELECT (for youth_pastor_note, calendar_url, ss info etc.)
-- (re-assert safe public read + admin update)
ALTER TABLE sermon_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view sermon settings" ON sermon_settings;
CREATE POLICY "Public can view sermon settings"
ON sermon_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update sermon settings" ON sermon_settings;
CREATE POLICY "Admins can update sermon settings"
ON sermon_settings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;

-- 5. Storage policies for youth-photos bucket (public read, admin write/delete)
-- These are on storage.objects
DROP POLICY IF EXISTS "Public can view youth photos" ON storage.objects;
CREATE POLICY "Public can view youth photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'youth-photos');

DROP POLICY IF EXISTS "Admins can upload to youth-photos" ON storage.objects;
CREATE POLICY "Admins can upload to youth-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'youth-photos' AND is_admin());

DROP POLICY IF EXISTS "Admins can delete from youth-photos" ON storage.objects;
CREATE POLICY "Admins can delete from youth-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'youth-photos' AND is_admin());

DROP POLICY IF EXISTS "Admins can update in youth-photos" ON storage.objects;
CREATE POLICY "Admins can update in youth-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'youth-photos' AND is_admin())
WITH CHECK (bucket_id = 'youth-photos' AND is_admin());

-- 6. Final grants for safety
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_albums TO authenticated;
GRANT SELECT ON public.youth_albums TO anon;

-- 7. Reload PostgREST schema cache (critical after policy changes)
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- AFTER RUNNING THIS:
-- 1. Go to Supabase Dashboard → Database → Replication
--    Find and toggle OFF then ON for these tables:
--      - youth_events
--      - youth_albums
--      - youth_photos
--      - sermon_settings
--    (This forces fresh policy visibility.)
-- 2. Hard refresh the public /youth-ministry and /youth pages (logged out).
-- 3. In Admin → Youth and Events tabs: create/edit should work for any admin.
-- 4. Albums and upcoming events should appear immediately for visitors.
-- ============================================================