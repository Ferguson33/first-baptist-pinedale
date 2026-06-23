-- Add per-sermon display control for the Sermons page (no RLS changes).
-- Run once in Supabase SQL Editor.
--
-- auto  = default; newest auto sermon embeds, others link
-- embed = always show embedded player (pin a popular message)
-- link  = always show YouTube link only

ALTER TABLE public.sermons
  ADD COLUMN IF NOT EXISTS embed_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.sermons
  DROP CONSTRAINT IF EXISTS sermons_embed_mode_check;

ALTER TABLE public.sermons
  ADD CONSTRAINT sermons_embed_mode_check
  CHECK (embed_mode IN ('auto', 'embed', 'link'));