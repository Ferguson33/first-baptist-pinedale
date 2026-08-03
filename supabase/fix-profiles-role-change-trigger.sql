-- ============================================================
-- FIX: "profile cannot be changed by this user" on Approve
--
-- Cause: a BEFORE UPDATE trigger on public.profiles that blocks
-- role changes unless auth.uid() = the row id. That stops:
--   • admins approving other members
--   • service_role API updates (auth.uid() is null)
--
-- Safe to re-run. Profiles-only. Does not touch sermons/storage.
-- ============================================================

-- 1) Ensure is_admin() exists
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

-- 2) Drop known restrictive triggers / functions (names vary by project history)
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
DROP TRIGGER IF EXISTS profiles_role_guard ON public.profiles;
DROP TRIGGER IF EXISTS enforce_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
DROP TRIGGER IF EXISTS profiles_before_update ON public.profiles;

-- Drop common function names if present (ignore if still used elsewhere)
DROP FUNCTION IF EXISTS public.protect_profile_role() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_profile_role_change() CASCADE;
DROP FUNCTION IF EXISTS public.profiles_role_guard() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_profile_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_profile_update() CASCADE;

-- 3) Replace with a safe guard:
--    - Anyone may update non-role fields per RLS
--    - Role may change only if:
--        a) service_role (admin API), OR
--        b) caller is admin (is_admin())
--    - Non-admins cannot escalate their own role
CREATE OR REPLACE FUNCTION public.profiles_guard_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  -- No role change → allow
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Service role (PostgREST / supabaseAdmin) may change roles
  BEGIN
    jwt_role := coalesce(
      current_setting('request.jwt.claim.role', true),
      current_setting('role', true),
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    jwt_role := '';
  END;

  IF jwt_role = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- Authenticated admin may approve / manage roles
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block everyone else (including self-escalation)
  RAISE EXCEPTION 'Profile role cannot be changed by this user'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_change ON public.profiles;
CREATE TRIGGER profiles_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_change();

-- 4) Keep admin UPDATE RLS (approve path)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 5) Dedicated approve RPC (admins via JWT, or service_role after API auth check)
CREATE OR REPLACE FUNCTION public.admin_approve_member(target_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.profiles;
  jwt_role text;
  allowed boolean := false;
BEGIN
  IF public.is_admin() THEN
    allowed := true;
  ELSE
    BEGIN
      jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
    EXCEPTION WHEN OTHERS THEN
      jwt_role := '';
    END;
    IF jwt_role = 'service_role'
       OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
      allowed := true;
    END IF;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Only admins can approve members' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = 'approved'
  WHERE id = target_id
    AND role IN ('pending', 'approved')  -- no demoting admins via this RPC
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Member profile not found or is an admin account';
  END IF;

  RETURN updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_member(uuid) TO service_role;

-- ============================================================
-- VERIFY (optional): list remaining triggers on profiles
-- SELECT tgname, pg_get_triggerdef(oid)
-- FROM pg_trigger
-- WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
-- ============================================================
