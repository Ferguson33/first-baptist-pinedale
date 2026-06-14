-- ============================================================
-- SERMONS PAGE IMPROVEMENTS: Public/curated + Live stream toggle + YouTube
-- Run in Supabase SQL Editor after previous sermon-settings-full.sql
-- ============================================================

-- 1. Add is_public to sermons for curated public sermons (visible without login)
ALTER TABLE public.sermons 
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 2. Add live_stream_active toggle to sermon_settings (admin controls visibility of live)
ALTER TABLE public.sermon_settings 
  ADD COLUMN IF NOT EXISTS live_stream_active boolean DEFAULT false;

-- 3. Ensure RLS policies allow public read for sermon_settings (already should)
-- (The live and settings are public for the active live detection on public site)

-- 4. Grants (safe)
GRANT SELECT ON public.sermons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sermons TO authenticated;

GRANT SELECT ON public.sermon_settings TO anon, authenticated;
GRANT UPDATE ON public.sermon_settings TO authenticated;

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';

-- Note: After running, toggle replication for sermons and sermon_settings in Supabase dashboard if schema cache issues.
-- Then in Admin > Sermons tab, you can set is_public on sermons, and toggle live_stream_active + live_video_id.
