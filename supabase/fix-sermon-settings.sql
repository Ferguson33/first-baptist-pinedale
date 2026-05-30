-- ============================================================
-- FIX / ENSURE ALL COLUMNS EXIST FOR SERMON SETTINGS
-- Run this in Supabase SQL Editor if the previous update didn't fully work
-- This is safe to run multiple times.
-- ============================================================

-- Make sure the table exists with the full current structure
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
  updated_at timestamptz DEFAULT now()
);

-- Add any missing columns (safe even if they already exist)
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
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure the single settings row exists
INSERT INTO sermon_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- Re-apply RLS policies (in case they were missing)
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

-- Grants
GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;

-- Optional: Refresh the schema cache (sometimes helps in Supabase)
NOTIFY pgrst, 'reload schema';

-- After running this, go to the Admin Dashboard → Sermons tab 
-- and try saving the date again. It should now persist.
