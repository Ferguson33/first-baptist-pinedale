-- ============================================================
-- NUCLEAR RESET FOR events TABLE (what has worked before)
-- This is modeled after the aggressive resets that finally fixed
-- building_progress and youth_photos when we were stuck in loops.
-- Run this entire script in the Supabase SQL Editor.
-- ============================================================

-- 1. Make sure RLS is on
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Aggressively drop EVERY policy that currently exists on the table
-- (This is the key step that has resolved conflicts in the past)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'events'
    LOOP
        RAISE NOTICE 'Dropping policy: %', pol.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
    END LOOP;
END $$;

-- 3. Re-create the minimal, correct public read policy
CREATE POLICY "Public can view events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Re-apply the grants (this has been the missing piece before)
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;

-- Optional but safe: allow authenticated users to insert/update/delete
-- (the admin UI will still control who can actually do it)
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;

-- 5. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- 6. Final verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events';

-- Test that the anon role can now see rows (this runs as your current role)
SELECT * FROM public.events ORDER BY date;