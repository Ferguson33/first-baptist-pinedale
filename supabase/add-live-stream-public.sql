-- Add public/private visibility for live streams (mirrors sermons.is_public)
ALTER TABLE public.sermon_settings
  ADD COLUMN IF NOT EXISTS live_stream_public boolean DEFAULT false;

-- Existing sermon_settings SELECT policy already allows row read; the app gates
-- live_video_id via /api/sermons/live based on live_stream_public + member role.

NOTIFY pgrst, 'reload schema';