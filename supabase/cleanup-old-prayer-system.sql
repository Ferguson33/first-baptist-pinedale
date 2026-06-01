-- ============================================================
-- OPTIONAL CLEANUP: Remove old Prayer Wall / Prayer Requests system
-- 
-- This feature was replaced by the Google Doc-based Prayer Bulletin.
-- Run this ONLY if you are comfortable dropping the data.
-- ============================================================

-- 1. Remove the prayer_auto_approve column from profiles (if it still exists)
ALTER TABLE profiles DROP COLUMN IF EXISTS prayer_auto_approve;

-- 2. Drop the old prayer_requests table and all its data/policies
DROP TABLE IF EXISTS prayer_requests CASCADE;

-- Note: If you had a prayer-photos storage bucket that is no longer used, 
-- you can safely delete it from the Supabase Storage dashboard.
