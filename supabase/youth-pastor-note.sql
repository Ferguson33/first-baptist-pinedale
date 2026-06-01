-- Add Youth-specific fields to sermon_settings
-- Run this in the Supabase SQL Editor

ALTER TABLE sermon_settings 
ADD COLUMN IF NOT EXISTS youth_pastor_note TEXT;

ALTER TABLE sermon_settings 
ADD COLUMN IF NOT EXISTS youth_google_doc_url TEXT;

-- Optional but recommended: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
