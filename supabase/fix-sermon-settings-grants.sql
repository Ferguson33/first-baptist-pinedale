-- ============================================================
-- FIX: sermon_settings update hangs / permission denied
-- Run once in Supabase → SQL Editor (project owner).
-- Safe to re-run.
-- ============================================================

-- Ensure singleton row exists
INSERT INTO public.sermon_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Grants (service_role used by /api/admin/sermon-settings)
GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;
GRANT ALL ON public.sermon_settings TO service_role;

ALTER TABLE public.sermon_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view sermon settings" ON public.sermon_settings;
CREATE POLICY "Public can view sermon settings"
ON public.sermon_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update sermon settings" ON public.sermon_settings;
CREATE POLICY "Admins can update sermon settings"
ON public.sermon_settings FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Optional: allow service_role unrestricted (bypasses RLS by default anyway)
-- No extra policy needed for service_role.
