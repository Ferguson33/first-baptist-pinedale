-- ============================================================
-- SAFE OPTIONAL CLEANUP — First Baptist Pinedale
-- ============================================================
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
--
-- WHAT THIS DOES (only things the live site no longer uses):
--   1. Drops legacy Prayer Wall table + leftover profile column
--   2. Drops old family / member-directory tables (replaced by Google Docs)
--
-- STORAGE NOTE:
--   Supabase blocks DELETE on storage.objects / storage.buckets via SQL.
--   If a "prayer-photos" bucket still exists, remove it in the UI:
--     Storage → prayer-photos → delete files (if any) → Delete bucket
--   Do NOT delete building-photos, youth-photos, member-photos, or sermons.
--
-- WHAT THIS NEVER TOUCHES (your working site):
--   profiles, sermons, sermon_settings, events, building_photos,
--   building_progress, youth_photos, youth_albums, youth_events,
--   is_admin(), or any RLS policies on those tables.
--
-- Safe to re-run: every step uses IF EXISTS patterns.
-- ============================================================

-- ------------------------------------------------------------
-- 0) Snapshot: what legacy objects still exist? (read-only)
-- ------------------------------------------------------------
SELECT 'table' AS kind, table_name AS name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'prayer_requests',
    'directory_members',
    'families',
    'family_members'
  )
UNION ALL
SELECT 'column', 'profiles.prayer_auto_approve'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'prayer_auto_approve'
UNION ALL
SELECT 'storage_bucket', id::text AS name
FROM storage.buckets
WHERE id IN ('prayer-photos', 'prayer_photos')
ORDER BY kind, name;

-- ------------------------------------------------------------
-- 1) LEGACY PRAYER WALL
--    Replaced by Prayer Bulletin (Google Doc on /prayer-bulletin)
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS prayer_auto_approve;

DROP TABLE IF EXISTS public.prayer_requests CASCADE;

-- ------------------------------------------------------------
-- 2) LEGACY MEMBER DIRECTORY (database model)
--    Replaced by Google Doc embeds on /members/directory
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.directory_members CASCADE;
DROP TABLE IF EXISTS public.family_members CASCADE;
DROP TABLE IF EXISTS public.families CASCADE;

-- ------------------------------------------------------------
-- 3) Confirm table/column leftovers are gone (should return 0 rows
--    for tables/columns; storage_bucket may still appear — use UI)
-- ------------------------------------------------------------
SELECT 'table' AS kind, table_name AS name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'prayer_requests',
    'directory_members',
    'families',
    'family_members'
  )
UNION ALL
SELECT 'column', 'profiles.prayer_auto_approve'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'prayer_auto_approve'
ORDER BY kind, name;

-- ------------------------------------------------------------
-- 4) Sanity check: core tables still present (should list these)
-- ------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'sermons',
    'sermon_settings',
    'events',
    'building_photos',
    'building_progress',
    'youth_photos',
    'youth_albums',
    'youth_events'
  )
ORDER BY table_name;

-- Done.
-- If step 3 is empty and step 4 lists your core tables, SQL cleanup succeeded.
-- Optional: Storage → delete "prayer-photos" bucket in the dashboard if it still exists.
