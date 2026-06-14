-- ============================================================
-- CLEANUP: Remove duplicate INSERT policies on profiles
--
-- From your verification query, you currently have:
-- - "Admins can insert profiles" (correct, only WITH CHECK)
-- - "Users can insert own profile"
-- - "Users can insert their own profile"  (duplicate of the above)
--
-- This script drops the duplicates and leaves one clean policy.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Drop all variants of the user self-insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;  -- in case old name

-- Recreate ONE clean policy for users to insert their own profile on signup
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Ensure the admin insert policy is clean (recreate it to be sure)
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
      AND p.role = 'admin'
  )
);

-- Grants (safe to re-run)
GRANT INSERT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Final verification - run this after to confirm only two clean INSERT policies
SELECT 
  policyname, 
  cmd, 
  with_check 
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'INSERT'
ORDER BY policyname;
