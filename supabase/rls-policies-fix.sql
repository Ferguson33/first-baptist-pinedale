-- ============================================================
-- RLS POLICIES FIX — Run this in Supabase SQL Editor (one time)
-- This fixes:
--   • Approved members editing their own profile (including family_id link)
--   • Approved members creating their own family ("Create My Family" was blocked)
--   • (old) Approved members deleting their own prayers on the Prayer Wall (no longer used)
--   • Adding children to families, etc.
-- ============================================================

-- 1) PROFILES — allow self-service updates + admin full control
-- (Previously only SELECT policies existed, so handleSave + family link updates were denied)

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Also allow admins to select everything if not already covered
DROP POLICY IF EXISTS "Admins can select all profiles" ON profiles;
CREATE POLICY "Admins can select all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- 2) PRAYER REQUESTS — allow a member to delete their own prayers
-- (The delete button now appears in the UI after the frontend fix; this makes the actual DELETE succeed)

DROP POLICY IF EXISTS "Users can delete their own prayers" ON prayer_requests;
CREATE POLICY "Users can delete their own prayers"
ON prayer_requests FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- (Admins already have the broad "admin_all_access" FOR ALL policy from schema.sql)

-- 3) FAMILIES — the core of the "Create Family" feature
-- Approved members (and admins) need to create, manage, and view families

-- Make sure RLS is on
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Grant basic privileges (prevents 42501 even when policies exist)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;

DROP POLICY IF EXISTS "Approved users can create their own family" ON families;
CREATE POLICY "Approved users can create their own family"
ON families FOR INSERT
TO authenticated
WITH CHECK (
  primary_contact_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'approved' OR profiles.role = 'admin')
  )
);

DROP POLICY IF EXISTS "Users can view families they own or are primary contact for" ON families;
CREATE POLICY "Users can view families they own or are primary contact for"
ON families FOR SELECT
TO authenticated
USING (
  primary_contact_id = auth.uid()
  OR id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid() AND family_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Owners and admins can update families" ON families;
CREATE POLICY "Owners and admins can update families"
ON families FOR UPDATE
TO authenticated
USING (
  primary_contact_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  primary_contact_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Optional but useful: allow admins to delete families if needed
DROP POLICY IF EXISTS "Admins can delete families" ON families;
CREATE POLICY "Admins can delete families"
ON families FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4) FAMILY_MEMBERS — children and extra people attached to a family

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;

DROP POLICY IF EXISTS "Owners can manage family members in their family" ON family_members;
CREATE POLICY "Owners can manage family members in their family"
ON family_members FOR ALL
TO authenticated
USING (
  family_id IN (
    SELECT id FROM families WHERE primary_contact_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  family_id IN (
    SELECT id FROM families WHERE primary_contact_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Also allow the owner (and admins) to SELECT the child rows
DROP POLICY IF EXISTS "Owners and admins can view family members" ON family_members;
CREATE POLICY "Owners and admins can view family members"
ON family_members FOR SELECT
TO authenticated
USING (
  family_id IN (
    SELECT id FROM families WHERE primary_contact_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
  OR family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  )
);

-- 5) Helpful note
-- After running this, approved members should be able to:
--   - Edit their full profile (photo, birthdate, spouse, notes, etc.)
--   - Create a family from /members/profile
--   - Add children to their family
--   - (old) Delete their own prayers on the Prayer Wall (feature no longer exists)
--
-- If you still see "permission denied" errors after this, double-check that the tables exist
-- and that you are running the statements as the project owner (not a limited role).