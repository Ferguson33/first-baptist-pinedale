-- ============================================================
-- YOUTH MINISTRY ENHANCEMENTS SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Youth Events table for upcoming events (editable in admin)
CREATE TABLE IF NOT EXISTS youth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  date date,
  description text,
  image_url text,
  link_url text,
  created_at timestamptz DEFAULT now()
);

-- 2. Add calendar embed URL for Heath's events to sermon_settings
ALTER TABLE sermon_settings 
  ADD COLUMN IF NOT EXISTS youth_calendar_url text;

-- 3. RLS for youth_events - public visible to all, admins (any) manage
ALTER TABLE youth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view youth events" ON youth_events;
CREATE POLICY "Public can view youth events"
ON youth_events FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage youth events" ON youth_events;
CREATE POLICY "Admins can manage youth events"
ON youth_events FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Grants
GRANT SELECT ON public.youth_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.youth_events TO authenticated;

-- 4. Update youth_photos and youth_albums policies if needed for public (already public from previous)
-- Ensure public select for albums (already done in youth-albums-setup)
-- Albums are already public per previous setup.

-- 5. Add is_admin grant if needed, but assume is_admin function exists.

NOTIFY pgrst, 'reload schema';

-- After run:
-- Toggle replication for youth_events and sermon_settings in dashboard.
-- Then use Admin > Youth tab to manage.
