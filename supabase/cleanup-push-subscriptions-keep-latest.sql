-- ============================================================
-- Cleanup stacked push devices (e.g. "sent to 11 devices")
-- Run once in Supabase → SQL Editor.
-- Keeps only the newest subscription row per admin user.
-- ============================================================

-- Preview what you have now
SELECT
  id,
  user_id,
  left(endpoint, 48) AS endpoint_preview,
  created_at,
  updated_at
FROM public.push_subscriptions
ORDER BY user_id, updated_at DESC NULLS LAST;

-- Keep only the most recently updated row per user_id
DELETE FROM public.push_subscriptions ps
WHERE ps.id NOT IN (
  SELECT keep.id
  FROM (
    SELECT DISTINCT ON (user_id) id
    FROM public.push_subscriptions
    ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  ) AS keep
);

-- Confirm: should be 1 row per admin who enabled
SELECT user_id, count(*) AS devices
FROM public.push_subscriptions
GROUP BY user_id;
