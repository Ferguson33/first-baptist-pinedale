-- ============================================================
-- SERMON SETTINGS (for homepage teaser + pastor note)
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS sermon_settings (
  id int PRIMARY KEY DEFAULT 1,
  pastor_note text,
  upcoming_title text,
  upcoming_reference text,
  upcoming_date date,
  updated_at timestamptz DEFAULT now()
);

-- Insert the single row if it doesn't exist
INSERT INTO sermon_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE sermon_settings ENABLE ROW LEVEL SECURITY;

-- Public can read (needed for homepage)
CREATE POLICY "Public can view sermon settings"
ON sermon_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update sermon settings"
ON sermon_settings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;

-- Note: We will later add a sermons table for actual archived videos
-- that are only visible to approved members.
