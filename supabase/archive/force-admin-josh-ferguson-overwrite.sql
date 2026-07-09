-- ============================================================
-- NUCLEAR OVERWRITE: FORCE JOSH FERGUSON TO ADMIN
-- Use this when the server route keeps saying "Forbidden - Admin access required"
-- even after the V3 service-role check is live.
--
-- This will CREATE the profile row if it is missing, or forcefully
-- set role = 'admin' if it already exists.
-- ============================================================

DO $$
DECLARE
  target_user_id uuid := '4ea0dad5-b9d8-49fd-873d-179567ebe0d5';
  target_email   text := 'josh.fergusonsublette@gmail.com';
  target_name    text := 'Josh Ferguson';
BEGIN
  RAISE NOTICE 'Forcing admin status for user % (%)', target_name, target_user_id;

  -- Force the profile row to exist with role = 'admin'
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    target_user_id,
    target_email,
    target_name,
    'admin',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role       = 'admin',
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();

  -- Re-create the is_admin() function cleanly (belt + suspenders)
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

  GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

  RAISE NOTICE 'Done. Profile should now have role = admin.';
END $$;

-- ============================================================
-- VERIFICATION - Run this after the block above
-- ============================================================
SELECT 
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
FROM public.profiles 
WHERE id = '4ea0dad5-b9d8-49fd-873d-179567ebe0d5';

-- Also show all admins for sanity check
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE role = 'admin'
ORDER BY updated_at DESC;
