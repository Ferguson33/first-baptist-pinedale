-- ============================================================
-- RLS POLICIES FOR SERMONS (Member-only access)
-- Run this after the main sermon-settings.sql
-- ============================================================

-- Enable RLS on the existing sermons table
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;

-- Public / non-members cannot read sermons
-- Only approved members and admins can read archived sermons
DROP POLICY IF EXISTS "Approved members can view sermons" ON sermons;
CREATE POLICY "Approved members can view sermons"
ON sermons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'approved' OR profiles.role = 'admin')
  )
);

-- Only admins can insert/update/delete sermons
DROP POLICY IF EXISTS "Admins can manage sermons" ON sermons;
CREATE POLICY "Admins can manage sermons"
ON sermons FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Grants
GRANT SELECT ON public.sermons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sermons TO authenticated;

-- Note: sermon_settings already has its own policies from the other file.
