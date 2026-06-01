-- ============================================================
-- OPTIONAL CLEANUP: Drop old unused tables
-- Run this ONLY if you are sure you no longer need the data.
-- These tables were part of the old dynamic directory system.
-- ============================================================

-- Drop old directory tables (no longer used - directory is now Google Doc based)
DROP TABLE IF EXISTS directory_members CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;

-- You can also drop these if they exist and are empty/unused:
-- DROP TABLE IF EXISTS prayer_requests_old CASCADE;   -- example of old backup tables

COMMENT ON SCHEMA public IS 'Cleaned up old family/directory tables on [DATE]';
