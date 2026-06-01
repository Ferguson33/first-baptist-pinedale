-- ============================================================
-- AGGRESSIVE FIX: Make the events table publicly readable
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Enable RLS (in case it's off)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Drop EVERY existing policy on the events table (clean slate)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'events'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
    END LOOP;
END $$;

-- 3. Create a simple, permissive public SELECT policy
CREATE POLICY "Public can view events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Grant SELECT privileges (this is often the missing piece)
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;

-- 5. Verify: This should show the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events';

-- 6. Test query (this will run as your current role — if it works here, the anon policy should also work)
SELECT * FROM public.events ORDER BY date LIMIT 5;