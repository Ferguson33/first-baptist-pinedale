# Supabase Cleanup Notes (May 2025, updated July 2026)

## Archived one-off / debug scripts
One-time diagnostics, nuclear resets, and personal admin-promotion scripts live in `archive/`.
They are **not** part of normal setup. Do not re-run them on production unless you know why.

## Prayer System Cleanup (latest)
- Old `prayer_requests` table and `prayer_auto_approve` column are legacy from the removed Prayer Wall feature.
- See `archive/cleanup-old-prayer-system.sql` for optional removal.
- `prayer-photos` storage bucket is no longer needed and can be deleted from the dashboard.


## What was cleaned up

- Removed `directory_members` table definition from the main `schema.sql` (no longer used).
- Moved obsolete family-centric directory files to `archive/`:
  - `families-setup.sql`
  - `schema-updates.sql`
- Removed dead `DirectoryMember` and `Family` TypeScript types from `lib/supabase.ts`.
- Updated documentation (README.md) to reflect current Google Doc approach.

## Optional: Drop old tables from your database

If you want to remove the old unused tables from your actual Supabase database, run:

```sql
-- See: archive/cleanup-old-tables.sql
```

**Warning:** Only run this if you are certain no one is still using the old data.

## Active / Important files (do not delete)

- `schema.sql` — Current base schema
- `sermon-access-policies.sql` — Controls who can see sermons
- `sermon-settings-full.sql` + related — Homepage sermon settings
- `building-data-public-access-fix.sql` — Contains `is_admin()` function
- `youth-photos-setup.sql`, `building-progress-policies.sql`, etc.

## Recommended next step

Consider setting up the Supabase CLI so future changes can be managed as proper migrations instead of manual copy/paste.
