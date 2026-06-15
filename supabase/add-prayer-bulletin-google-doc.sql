-- Add prayer_bulletin_google_doc_url to sermon_settings for the Prayer Bulletin page embed (member-only)
-- Run this in Supabase SQL Editor

ALTER TABLE sermon_settings 
  ADD COLUMN IF NOT EXISTS prayer_bulletin_google_doc_url text;

-- Ensure public (anon/authenticated) can read it (existing policy on sermon_settings should cover new columns)
GRANT SELECT ON public.sermon_settings TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- After running:
-- 1. Toggle replication for sermon_settings in Dashboard → Database → Replication if needed.
-- 2. In Admin (Sermons or a new section), set the published embed URL for the Prayer Bulletin Google Doc.
-- 3. The embed will appear on the protected /prayer-bulletin page for approved members.

-- To get the embed URL:
-- Open the doc → File → Share → Publish to web → Click "Publish" → Copy the src from the <iframe> example.
-- Use the /pub?embedded=true version.

-- The page remains protected (approved members only) via the existing auth check in prayer-bulletin/page.tsx.