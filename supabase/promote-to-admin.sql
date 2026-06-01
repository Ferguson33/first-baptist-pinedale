-- ============================================================
-- PROMOTE A USER TO ADMIN
-- Run this in the SQL Editor to give a user full admin rights
-- (including ability to upload youth photos, manage albums, etc.)
-- ============================================================

-- Replace the email below with the account you want to make admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'jncferguson18@gmail.com';   -- <-- CHANGE THIS EMAIL

-- Verify it worked
SELECT id, email, full_name, role 
FROM profiles 
WHERE email = 'jncferguson18@gmail.com';
