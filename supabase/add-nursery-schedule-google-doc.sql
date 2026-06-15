-- ============================================================
-- Add nursery_schedule_google_doc_url to sermon_settings for the Nursery Schedule (member-only)
-- Run this in Supabase SQL Editor.
-- This allows the nursery schedule to be a Google Doc embed like the Prayer Bulletin,
-- fully managed remotely from the Admin Dashboard, behind the member wall.
-- ============================================================

ALTER TABLE sermon_settings 
  ADD COLUMN IF NOT EXISTS nursery_schedule_google_doc_url text;

-- Public read access (anon + authenticated) for the settings table.
-- The existing policy for sermon_settings already allows this for the other doc URLs.
GRANT SELECT ON public.sermon_settings TO anon, authenticated;

-- Reload PostgREST schema cache so the new column is visible immediately.
NOTIFY pgrst, 'reload schema';

-- After running this SQL:
-- 1. (If needed) Toggle the "replicate" switch for the sermon_settings table in Supabase Dashboard > Database > Replication.
-- 2. In the Admin Dashboard (Sermons tab), a new "Nursery Schedule Google Doc" section will appear.
--    Your wife (or admin) can paste the published embed URL there.
-- 3. The /nursery-schedule page will show the embed for approved members only.
-- 4. When saving the URL in admin, it will revalidate the page.

-- How to get the embed URL (for your wife):
-- 1. Create/edit the Google Doc with the nursery schedule.
-- 2. File > Share > Publish to web.
-- 3. Click "Publish".
-- 4. In the "Embed" example, copy the src URL (the long https://docs.google.com/.../pub?embedded=true part).
--    You can paste the full <iframe> tag or just the URL into the admin field — it will extract automatically.

-- The page is protected exactly like /prayer-bulletin (approved members only).