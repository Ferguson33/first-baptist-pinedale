# Archived SQL scripts

These files are **historical or one-off**. They are not needed for day-to-day site operation.

## Do not run on production unless you understand the impact

| File | Why archived |
|------|----------------|
| `families-setup.sql`, `schema-updates.sql` | Old family/directory model (site uses Google Docs now) |
| `cleanup-old-tables.sql`, `cleanup-old-prayer-system.sql` | Optional legacy drops after Prayer Wall removal |
| `check-is-admin.sql`, `check-duplicate-is-admin.sql` | Diagnostics only |
| `debug-allow-youth-insert.sql`, `diagnose-youth-rls.sql` | Temporary RLS debugging |
| `youth-photos-nuclear-reset.sql`, `youth-photos-policies-reset.sql` | Aggressive policy resets (one-time recovery) |
| `fix-events-rls-nuclear.sql` | Aggressive events RLS reset (one-time recovery) |
| `force-admin-josh-ferguson-overwrite.sql` | One-time admin promotion for a specific user |

For current setup, start from `../schema.sql` and the non-archived `fix-*.sql` / feature scripts only when needed.
