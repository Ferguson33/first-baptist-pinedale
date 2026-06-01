-- Add Live Stream support to sermon_settings
-- Run this in the Supabase SQL Editor

ALTER TABLE sermon_settings 
ADD COLUMN IF NOT EXISTS live_video_id TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
