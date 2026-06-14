-- ============================================================
-- FIX SERMONS RLS: Allow PUBLIC (anon) access to CURATED sermons (is_public=true)
-- + Approved members can see the FULL archive.
--
-- THIS IS THE FILE YOU SHOULD COPY AND PASTE ENTIRELY INTO THE SUPABASE SQL EDITOR.
-- Do NOT copy individual lines or explanations from chat.
--
-- Problem this fixes:
--   - You marked a sermon as "curated" (is_public) in admin.
--   - It shows in the admin Sermons tab (because admins bypass via is_admin()).
--   - But it does NOT appear on the public /sermons page for non-logged-in visitors.
--   - Reason: the old policy only allowed approved/authenticated users to SELECT any sermons.
--
-- After running:
--   1. Go to Supabase Dashboard > Database > Replication.
--   2. Find the "sermons" table and toggle replication OFF then back ON (forces schema cache refresh).
--   3. Hard refresh your browser (Ctrl/Cmd + Shift + R) on the public /sermons page while logged out.
--   4. The curated sermon should now be visible to the public.
-- ============================================================

-- Make sure RLS is on
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

-- Drop the old restrictive policy that was blocking public access
DROP POLICY IF EXISTS "Approved members can view sermons" ON public.sermons;

-- NEW: Anyone (public visitors + logged in) can read sermons that the admin has marked as curated (is_public = true)
-- This powers the "Curated Sermons" section on the public site (no login required).
CREATE POLICY "Public can view curated (is_public) sermons"
ON public.sermons FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- NEW: Logged-in approved members and admins can read the COMPLETE list of sermons (full archive)
-- This is layered on top of the public curated policy.
CREATE POLICY "Approved members can view all sermons"
ON public.sermons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'approved' OR profiles.role = 'admin')
  )
);

-- Keep admin full control for insert/update/delete
DROP POLICY IF EXISTS "Admins can manage sermons" ON public.sermons;
CREATE POLICY "Admins can manage sermons"
ON public.sermons FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Critical: Grant SELECT to anon so public visitors can actually read the curated rows
GRANT SELECT ON public.sermons TO anon;
GRANT SELECT ON public.sermons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sermons TO authenticated;

-- Force PostgREST to reload its schema cache (important!)
NOTIFY pgrst, 'reload schema';
