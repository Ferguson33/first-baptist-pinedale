-- This is the exact pattern that finally broke the 401 loop on previous tables
-- (building_progress, youth_photos, etc.) when "anon, authenticated" wasn't enough.

DROP POLICY IF EXISTS "Public can view events" ON public.events;

CREATE POLICY "Public can view events"
ON public.events
FOR SELECT
TO public
USING (true);

-- Also ensure the grant is there
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;

-- Force cache reload
NOTIFY pgrst, 'reload schema';