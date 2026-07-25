-- Youth page activity video (public embed, managed in Admin → Sermons)
-- Run in Supabase SQL Editor. Safe to run multiple times.

ALTER TABLE public.sermon_settings
  ADD COLUMN IF NOT EXISTS youth_activity_video_id text;

GRANT SELECT ON public.sermon_settings TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
