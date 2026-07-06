-- Add homepage video fields to sermon_settings (welcome + pastor intro shorts)
-- Run in Supabase SQL Editor. Safe to run multiple times.

ALTER TABLE sermon_settings
  ADD COLUMN IF NOT EXISTS welcome_video_id text,
  ADD COLUMN IF NOT EXISTS pastor_york_video_id text,
  ADD COLUMN IF NOT EXISTS pastor_holmes_video_id text;

-- Seed the current welcome video if not set yet
UPDATE sermon_settings
SET welcome_video_id = 'Q6KqJyF_Teg'
WHERE id = 1
  AND (welcome_video_id IS NULL OR trim(welcome_video_id) = '');

GRANT SELECT ON public.sermon_settings TO anon, authenticated;

NOTIFY pgrst, 'reload schema';