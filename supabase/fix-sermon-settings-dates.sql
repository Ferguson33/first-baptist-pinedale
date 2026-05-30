-- ============================================================
-- NUCLEAR OPTION: Fix sermon_settings schema once and for all
-- This will DROP and RECREATE the table cleanly with ALL required columns.
-- This is the most reliable way to clear any schema cache corruption.
--
-- WARNING: This will delete any existing data in sermon_settings.
-- You will need to re-enter the "Note from the Pastor" text.
-- The upcoming sermon / Sunday School fields will be empty after this (which is fine).
-- ============================================================

-- 1. Drop the old table (if it exists)
DROP TABLE IF EXISTS sermon_settings;

-- 2. Create it fresh with every column we currently use
CREATE TABLE sermon_settings (
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

-- 3. Insert the single settings row
INSERT INTO sermon_settings (id) VALUES (1);

-- 4. Set up RLS and permissions
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

GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;

-- 5. Force PostgREST to see the new schema
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- AFTER RUNNING THIS SCRIPT:
--
-- 1. Go to Supabase Dashboard → Database → Replication
-- 2. Find the table "sermon_settings"
-- 3. Toggle it OFF, click Save, then toggle it back ON, click Save.
--    (This is the most important step for clearing the cache.)
--
-- 4. Hard refresh your Admin Dashboard (Cmd/Ctrl + Shift + R)
--
-- 5. Go to Admin → Sermons and Youth tabs and re-enter your dates + lessons.
--    Then save.
--
-- 6. Hard refresh the public homepage. The correct Sunday dates should now appear.
--
-- This should finally make the date fields save and display correctly.
-- ============================================================