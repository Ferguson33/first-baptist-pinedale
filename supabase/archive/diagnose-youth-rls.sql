-- Run this as your admin user to debug RLS issues on youth_photos

-- 1. Check your own role
SELECT id, email, full_name, role, is_admin() as am_i_admin 
FROM profiles 
WHERE id = auth.uid();

-- 2. List all current policies on youth_photos
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'youth_photos';

-- 3. List all current policies on youth_albums
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'youth_albums';

-- 4. Check if the is_admin() function exists and its definition
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin';
