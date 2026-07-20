-- ============================================================
-- FIX: "permission denied for table profiles"
-- (blocks admin push Enable / test, and can break other admin APIs)
--
-- Run in Supabase → SQL Editor (same project as the live site).
-- Safe to re-run.
-- ============================================================

-- 1) Table-level grants (this is the usual cause of the exact error text)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) is_admin() helper used by many policies
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

-- 3) Minimum SELECT policies so an admin can read their own row
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

-- 4) Reload API schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFICATION (run after the script above)
-- ============================================================
-- A) Table exists + your admin row
--    SELECT id, email, role FROM public.profiles WHERE role = 'admin';
--
-- B) Grants (must include service_role + authenticated SELECT)
--    SELECT grantee, privilege_type
--    FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND table_name = 'profiles'
--    ORDER BY grantee, privilege_type;
--
-- C) As SQL Editor (postgres role) this should return rows, not errors:
--    SELECT count(*) FROM public.profiles;
