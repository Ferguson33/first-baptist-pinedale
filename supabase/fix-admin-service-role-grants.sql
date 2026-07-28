-- ============================================================
-- FIX: Admin saves hang / permission denied (all admin tables)
-- Run once in Supabase → SQL Editor (project owner).
-- Safe to re-run.
--
-- App writes now go through:
--   /api/admin/sermon-settings
--   /api/admin/sermons
--   /api/admin/mutate
--   /api/admin/members/delete
--   /api/admin/storage/*
-- which use the service role after checking the admin JWT.
-- ============================================================

-- is_admin() used by many RLS policies
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Service role must fully manage these tables
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.sermons TO service_role;
GRANT ALL ON public.sermon_settings TO service_role;
GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.youth_albums TO service_role;
GRANT ALL ON public.youth_events TO service_role;
GRANT ALL ON public.youth_photos TO service_role;
GRANT ALL ON public.building_progress TO service_role;
GRANT ALL ON public.building_photos TO service_role;

-- Authenticated grants (client reads + legacy paths)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sermons TO authenticated;
GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_albums TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_photos TO authenticated;
GRANT SELECT, UPDATE ON public.building_progress TO authenticated;
GRANT SELECT ON public.building_progress TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_photos TO authenticated;

-- Singleton rows
INSERT INTO public.sermon_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.building_progress (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
