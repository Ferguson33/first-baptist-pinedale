-- ============================================================
-- FIX: Profiles SELECT RLS so admins (and members) can re-fetch their profile
--       after hard refresh / reload while inside the admin dashboard.
--
-- Symptom this fixes:
--   - You can log in and reach /admin.
--   - But on reload (Cmd/Ctrl+R) while on any admin tab, you see
--     "Checking permissions…" and/or it redirects you to login with
--     "Admin access only" toast.
--   - Root cause: fetchProfile() in the auth context does
--       .from('profiles').select('*').eq('id', auth.uid()).single()
--     On any error (RLS "permission denied", 42501, etc.) it returns null.
--     Then isAdmin = false (derived), the admin page guard shows the
--     checking message, and the redirect useEffect sends you to /login.
--
-- This script:
--   - Recreates the is_admin() helper (SECURITY DEFINER) — used by almost
--     everything else in the app (events, youth, sermons, building, etc.).
--   - Drops all old/variant SELECT policies on profiles (the early leaky ones
--     from schema.sql + any from rls-policies-fix.sql etc.).
--   - Creates two clean, reliable SELECT policies:
--       1. Any authenticated user can read THEIR OWN profile row
--          (this is what fetchProfile needs on every refresh).
--       2. Admins (via is_admin()) can read ALL profile rows
--          (needed for the Members tab SELECT *, and for the role-check
--           subqueries that other policies do against profiles).
--   - Ensures the necessary GRANTs.
--
-- After running:
--   1. Hard refresh the admin dashboard — you should stay logged in as admin
--      with no "permissions" message and no redirect.
--   2. The Members list will be able to load all rows (including pending).
--   3. Any other policy that does an EXISTS subquery on profiles.role
--      (sermons "approved members can view all", prayer admin access, etc.)
--      will work reliably.
--
-- Run this in the Supabase SQL Editor (as the project owner).
-- Then, in the Supabase Dashboard:
--   Database → Replication → find the "profiles" table → toggle the
--   "Replicate" / "Expose in Data API" switch OFF then back ON
--   (or run: NOTIFY pgrst, 'reload schema'; )
-- ============================================================

-- 1. Make sure the is_admin() helper exists and is correct (matches the pattern
--    used by all other admin policies in the project).
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

-- 2. Clean up ALL existing SELECT policies on profiles so we start fresh
--    (covers the old ones from schema.sql, rls-policies-fix.sql, and any variants).
DROP POLICY IF EXISTS "Public can read approved profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can select all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;           -- in case of other names
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

-- 3. The policy that makes refresh work for everyone (including admins):
--    Any authenticated user can SELECT their own row.
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. Admins can read every row (for the Members tab full list, and so that
--    role-check subqueries in other tables' policies succeed).
CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_admin());

-- 5. Grants (safe to re-run; prevents 42501 even when policies look correct).
GRANT SELECT ON public.profiles TO authenticated;
-- (We intentionally do NOT grant SELECT to anon here — the old "public can read
--  approved" policy was leaking approved/admin rows. If you ever need a public
--  member list again, expose it through a view or the Google Doc instead.)

-- 6. (Bonus for robustness) Make sure a self-update policy exists so admins
--    or users can edit their own profile row if needed in the future.
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Optional: admins can update any profile (useful if you ever add profile editing in admin)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================
-- Verification (run these after the script, while signed in as the admin
-- in the SQL editor or via the app — they should return rows, not permission errors):
--
--   SELECT is_admin();                    -- should be true for an admin account
--   SELECT * FROM profiles WHERE id = auth.uid();   -- your own profile (the fetchProfile call)
--   SELECT count(*) FROM profiles;        -- admins should see all rows (including pending)
--
-- If the last one returns only 1 row (yourself), the "Admins can read all profiles"
-- policy did not take effect yet — toggle replication for the profiles table.
-- ============================================================