-- ============================================================
-- QUICK FIX for: ERROR: 42601: only WITH CHECK expression allowed for INSERT
--
-- This error happens when an RLS INSERT policy includes a USING clause.
-- Postgres only allows WITH CHECK for INSERT policies.
--
-- Run this entire block in the Supabase SQL Editor.
-- ============================================================

-- Fix the admin insert policy (the one that had the invalid USING)
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

-- Also ensure the self-insert policy for new signups is correct (this one was already OK)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Make sure grants exist (prevents permission denied on insert)
GRANT INSERT ON public.profiles TO authenticated;

-- Quick verification (run after)
-- You should see the policies without USING for INSERT
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'INSERT';

-- After this, re-run your signup or the pending membership creation.
-- The profile row should now be insertable during signUp.
