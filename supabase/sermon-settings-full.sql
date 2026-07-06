-- ============================================================
-- COMPLETE SERMON SETTINGS TABLE SETUP (Run this in Supabase SQL Editor)
-- This ensures ALL columns needed for the homepage and admin are present.
-- Safe to run multiple times.
-- ============================================================

-- 1. Create the table with the full current structure if it doesn't exist
CREATE TABLE IF NOT EXISTS sermon_settings (
  id int PRIMARY KEY DEFAULT 1,
  pastor_note text,
  upcoming_title text,
  upcoming_reference text,
  upcoming_date date,
  sunday_school_lesson text,
  sunday_school_reference text,
  youth_sunday_school_lesson text,
  youth_sunday_school_reference text,
  youth_sunday_school_date date,
  live_video_id text,
  live_stream_active boolean DEFAULT false,
  welcome_video_id text,
  pastor_york_video_id text,
  pastor_holmes_video_id text,
  updated_at timestamptz DEFAULT now()
);

-- 2. Add any columns that might be missing (this is the key part for schema cache issues)
ALTER TABLE sermon_settings 
  ADD COLUMN IF NOT EXISTS pastor_note text,
  ADD COLUMN IF NOT EXISTS upcoming_title text,
  ADD COLUMN IF NOT EXISTS upcoming_reference text,
  ADD COLUMN IF NOT EXISTS upcoming_date date,
  ADD COLUMN IF NOT EXISTS sunday_school_lesson text,
  ADD COLUMN IF NOT EXISTS sunday_school_reference text,
  ADD COLUMN IF NOT EXISTS youth_sunday_school_lesson text,
  ADD COLUMN IF NOT EXISTS youth_sunday_school_reference text,
  ADD COLUMN IF NOT EXISTS youth_sunday_school_date date,
  ADD COLUMN IF NOT EXISTS live_video_id text,
  ADD COLUMN IF NOT EXISTS live_stream_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_video_id text,
  ADD COLUMN IF NOT EXISTS pastor_york_video_id text,
  ADD COLUMN IF NOT EXISTS pastor_holmes_video_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Ensure the single row (id=1) exists
INSERT INTO sermon_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS and set policies
ALTER TABLE sermon_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view sermon settings" ON sermon_settings;
CREATE POLICY "Public can view sermon settings"
ON sermon_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update sermon settings" ON sermon_settings;
CREATE POLICY "Admins can update sermon settings"
ON sermon_settings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 5. Grants
GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;

-- 6. Force PostgREST to reload the schema cache (critical!)
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- AFTER RUNNING THIS:
-- 1. Go to Supabase Dashboard → Database → Replication
-- 2. Find "sermon_settings", toggle it OFF then back ON (this forces a full refresh)
-- 3. Hard refresh your Admin Dashboard (Cmd/Ctrl + Shift + R)
-- 4. Test saving dates and Sunday School info
-- ============================================================