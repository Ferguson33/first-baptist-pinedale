-- ============================================================
-- FIX: "profile cannot be changed by this user" / "database is blocking role changes"
-- Run entire file in Supabase → SQL Editor as project owner.
-- Safe to re-run. Profiles only — no sermons/storage changes.
-- ============================================================

-- 1) is_admin()
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

-- 2) Drop EVERY user trigger on public.profiles (keeps system/internal ones)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.profiles', r.tgname);
    RAISE NOTICE 'Dropped trigger: %', r.tgname;
  END LOOP;
END $$;

-- Drop old guard functions if present
DROP FUNCTION IF EXISTS public.protect_profile_role() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_profile_role_change() CASCADE;
DROP FUNCTION IF EXISTS public.profiles_role_guard() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_profile_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_profile_update() CASCADE;
DROP FUNCTION IF EXISTS public.profiles_guard_role_change() CASCADE;

-- 3) Safe role guard:
--    Block ONLY logged-in non-admins from changing role.
--    service_role, postgres, and admins are allowed.
CREATE OR REPLACE FUNCTION public.profiles_guard_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_role text;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Who is making this request?
  BEGIN
    req_role := coalesce(auth.role(), '');
  EXCEPTION WHEN OTHERS THEN
    req_role := '';
  END;

  -- service_role / backend / SQL editor: always allow role updates
  IF req_role IN ('service_role', 'supabase_admin')
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Authenticated admin: allow
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Everyone else (including members editing their own profile): cannot change role
  RAISE EXCEPTION 'Profile role cannot be changed by this user'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER profiles_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_change();

-- 4) RLS: admins can update any profile row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Keep self-update if missing (non-role fields)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 5) Approve RPC (used by /api/admin/members/approve)
--    SECURITY DEFINER + allows service_role and is_admin()
CREATE OR REPLACE FUNCTION public.admin_approve_member(target_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.profiles;
  req_role text;
  allowed boolean := false;
BEGIN
  BEGIN
    req_role := coalesce(auth.role(), '');
  EXCEPTION WHEN OTHERS THEN
    req_role := '';
  END;

  IF public.is_admin() THEN
    allowed := true;
  ELSIF req_role IN ('service_role', 'supabase_admin') THEN
    allowed := true;
  ELSIF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    allowed := true;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Only admins can approve members' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = 'approved'
  WHERE id = target_id
    AND coalesce(role, 'pending') IN ('pending', 'approved')
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Member profile not found or cannot be approved (admin accounts are protected)';
  END IF;

  RETURN updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_member(uuid) TO service_role;

-- 6) Sanity checks (read the Results / Notices)
SELECT tgname AS remaining_triggers
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass
  AND NOT tgisinternal;

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
