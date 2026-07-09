-- Temporary debug policy to bypass is_admin() check for youth_photos INSERT
-- This will let ANY authenticated user insert into youth_photos
-- Run this to test if the upload works when we ignore the admin check.

DROP POLICY IF EXISTS "Admins can insert youth photos" ON youth_photos;

CREATE POLICY "Admins can insert youth photos"
ON youth_photos FOR INSERT
TO authenticated
WITH CHECK (true);   -- TEMPORARY: allow all authenticated inserts for debugging

-- After testing, you should revert to the proper policy using is_admin()
-- See youth-photos-policies-reset.sql or youth-photos-nuclear-reset.sql
