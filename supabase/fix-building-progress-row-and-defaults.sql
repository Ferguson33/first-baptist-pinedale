-- ============================================================
-- FIX BUILDING PROGRESS: Ensure row exists + safe defaults
-- WITHOUT hardcoding any progress percentage.
--
-- IMPORTANT:
--   - This will NEVER overwrite the current value set in the admin dashboard.
--   - The ONLY way the % changes is when you use the admin UI.
--   - Run this in Supabase SQL Editor if the row is missing or defaults are wrong.
-- ============================================================

-- 1. Set safe defaults (0%) so that if a row ever needs to be created from scratch,
--    it doesn't fall back to the old 68% default that was in the original schema.
ALTER TABLE public.building_progress 
  ALTER COLUMN physical_percent SET DEFAULT 0,
  ALTER COLUMN funds_raised SET DEFAULT 0,
  ALTER COLUMN funds_goal SET DEFAULT 0;

-- 2. Ensure the single canonical row (id=1) exists.
--    This uses ON CONFLICT DO NOTHING so it will NOT touch or reset
--    whatever value you last saved from the admin dashboard.
INSERT INTO public.building_progress (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3. Verify what is currently in the database (this is what the public pages will show)
SELECT 
  id,
  physical_percent,
  funds_raised,
  funds_goal,
  physical_note,
  updated_at
FROM public.building_progress 
WHERE id = 1;

-- After running:
--   - The value you see in the SELECT above is the ONLY source of truth.
--   - Go to /admin → Building Project tab and use "Update Progress Numbers" to set the real current %.
--   - Then hard-refresh the homepage and /building-project page (while logged out) to confirm.
