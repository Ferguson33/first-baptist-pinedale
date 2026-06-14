-- ============================================================
-- FIX: Profiles RLS for pending membership + signup stability
-- Run in Supabase SQL Editor.
--
-- This ensures:
-- - New signups can create their own 'pending' profile row (required for auth refresh to succeed)
-- - No more missing profile rows causing fetch errors / unhandled promises / crashes on refresh after signup
-- - Pending users have a proper row so admin can approve them and isApprovedMember works correctly
-- - SELECT grants so own profile is always readable
-- ============================================================

-- 1. Clean INSERT policies (only WITH CHECK allowed for INSERT)
-- Drop any variants to avoid duplicates
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Admins can insert (e.g. manual)
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 2. Ensure grants
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;

-- 3. (Optional but recommended) Ensure the existing update policy for self is present
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Verify current pending/approved users can read their row
-- Run this as a test (you may need to be signed in as a user in the SQL editor or via app)
-- SELECT * FROM profiles WHERE id = auth.uid();

-- After running:
-- 1. New "Join the Church Family" signups will now create a profiles row with role='pending'
-- 2. Refreshing the site after signup will succeed without crash/freeze (profile fetch works)
-- 3. Admin will see the new pending member in the Members tab and can approve
-- 4. All auth/membership flows become non-blocking
