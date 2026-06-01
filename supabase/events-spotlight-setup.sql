-- ============================================================
-- EVENTS TABLE - Spotlight / Special Events Setup
-- Run this to enable the admin Events tab to save real events
-- that can appear on the public Events page.
-- ============================================================

-- 1. Make sure RLS is enabled
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Public can view all events (we'll control visibility via admin)
DROP POLICY IF EXISTS "Public can view events" ON public.events;
CREATE POLICY "Public can view events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Only admins can manage events
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events"
ON public.events
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 4. Grants
GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;

-- 5. Optional: Add an "active" or "featured" flag later if needed
-- For now we can just show all events that exist in the table.

COMMENT ON TABLE public.events IS 'Special / one-off events that can be spotlighted on the public Events page.';