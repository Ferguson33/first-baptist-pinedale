-- ============================================================
-- FIX: "permission denied for table profiles / sermons"
-- Run once in Supabase → SQL Editor (project owner).
-- Safe to re-run.
-- ============================================================

-- 1) is_admin() (used by many RLS policies)
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

-- 2) PROFILES — admin check + grants (service_role must be able to read)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- 3) SERMONS — public read curated + members read all + admins manage
GRANT SELECT ON public.sermons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sermons TO authenticated;
GRANT ALL ON public.sermons TO service_role;

ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view curated (is_public) sermons" ON public.sermons;
CREATE POLICY "Public can view curated (is_public) sermons"
ON public.sermons FOR SELECT
TO anon, authenticated
USING (is_public = true);

DROP POLICY IF EXISTS "Approved members can view all sermons" ON public.sermons;
CREATE POLICY "Approved members can view all sermons"
ON public.sermons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'approved' OR profiles.role = 'admin')
  )
);

DROP POLICY IF EXISTS "Admins can manage sermons" ON public.sermons;
CREATE POLICY "Admins can manage sermons"
ON public.sermons FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4) Optional embed_mode column (safe if already present)
ALTER TABLE public.sermons
  ADD COLUMN IF NOT EXISTS embed_mode text;

-- Prefer constraint if column is new / open
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sermons_embed_mode_check'
  ) THEN
    UPDATE public.sermons SET embed_mode = 'auto' WHERE embed_mode IS NULL;
    ALTER TABLE public.sermons
      ALTER COLUMN embed_mode SET DEFAULT 'auto';
    BEGIN
      ALTER TABLE public.sermons
        ADD CONSTRAINT sermons_embed_mode_check
        CHECK (embed_mode IS NULL OR embed_mode IN ('auto', 'embed', 'link'));
    EXCEPTION WHEN others THEN
      NULL; -- ignore if type mismatch
    END;
  END IF;
END $$;

-- 5) Reload API schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFY (run after):
--   SELECT grantee, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public' AND table_name IN ('profiles', 'sermons')
--   ORDER BY table_name, grantee, privilege_type;
--
--   SELECT id, email, role FROM public.profiles WHERE role = 'admin';
-- ============================================================
