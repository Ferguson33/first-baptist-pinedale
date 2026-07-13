-- ============================================================
-- FIX: "permission denied for table" on photo uploads
--
-- Run this entire script in Supabase → SQL Editor → New query → Run
--
-- Why this happens:
--   Postgres needs table GRANTs in addition to RLS policies.
--   Without GRANT INSERT/SELECT, you get:
--     "permission denied for table building_photos"
--     (or youth_photos)
-- ============================================================

-- 1) is_admin() helper (used by insert/delete policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- ============================================================
-- 2) BUILDING PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.building_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE public.building_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view building photos" ON public.building_photos;
CREATE POLICY "Public can view building photos"
ON public.building_photos FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert building photos" ON public.building_photos;
CREATE POLICY "Admins can insert building photos"
ON public.building_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update building photos" ON public.building_photos;
CREATE POLICY "Admins can update building photos"
ON public.building_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete building photos" ON public.building_photos;
CREATE POLICY "Admins can delete building photos"
ON public.building_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Critical grants (this is what fixes "permission denied for table")
GRANT SELECT ON public.building_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.building_photos TO authenticated;
GRANT ALL ON public.building_photos TO service_role;

-- ============================================================
-- 3) YOUTH PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.youth_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  caption text,
  album_id uuid,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE public.youth_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view youth photos" ON public.youth_photos;
CREATE POLICY "Public can view youth photos"
ON public.youth_photos FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert youth photos" ON public.youth_photos;
CREATE POLICY "Admins can insert youth photos"
ON public.youth_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update youth photos" ON public.youth_photos;
CREATE POLICY "Admins can update youth photos"
ON public.youth_photos FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete youth photos" ON public.youth_photos;
CREATE POLICY "Admins can delete youth photos"
ON public.youth_photos FOR DELETE
TO authenticated
USING (is_admin());

GRANT SELECT ON public.youth_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;
GRANT ALL ON public.youth_photos TO service_role;

-- ============================================================
-- 4) Quick check (optional — should return true while logged in as admin
--    if you run it from the SQL editor as postgres/owner you can ignore)
-- ============================================================
-- SELECT is_admin();
-- SELECT has_table_privilege('authenticated', 'public.building_photos', 'INSERT');
-- SELECT has_table_privilege('authenticated', 'public.building_photos', 'SELECT');

NOTIFY pgrst, 'reload schema';
