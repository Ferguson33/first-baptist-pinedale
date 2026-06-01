-- Quick fix: Ensure the events table is publicly readable
-- Run this in Supabase SQL Editor

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view events" ON public.events;

CREATE POLICY "Public can view events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;

-- Verify it worked
SELECT * FROM public.events ORDER BY date;