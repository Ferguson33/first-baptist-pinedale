-- ============================================================
-- Add events_google_doc_url to sermon_settings for the Events page embed
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE sermon_settings 
  ADD COLUMN IF NOT EXISTS events_google_doc_url text;

-- Ensure public can read it (the existing "Public can view sermon settings" policy already covers new columns)
-- Re-grant just in case
GRANT SELECT ON public.sermon_settings TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- After running:
-- 1. (Optional) Toggle replication for sermon_settings in Dashboard → Database → Replication if you see stale schema.
-- 2. In Admin → Events tab, paste the published embed URL for the Google Doc.
-- 3. The embed will appear on the public /events page (read-only, no edit link).

-- To get the correct uneditable embed URL for your doc:
-- Open the doc → File → Share → Publish to web → Click "Publish" → Copy the src URL from the <iframe> example (it will look like https://docs.google.com/document/d/e/XXXXXX/pub?embedded=true)
-- Do NOT use the /edit link you gave — that one requires login and is editable.
