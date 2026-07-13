export type SermonEmbedMode = 'auto' | 'embed' | 'link';

export const SERMON_EMBED_MODE_LABELS: Record<SermonEmbedMode, string> = {
  auto: 'Automatic (newest embeds)',
  embed: 'Always embed on site',
  link: 'YouTube link only',
};

/** Church YouTube channel — used for “older archived sermons” on the Sermons page. */
export const YOUTUBE_CHANNEL_URL =
  'https://www.youtube.com/@FirstBaptistChurchofPinedale';

export function normalizeEmbedMode(mode?: string | null): SermonEmbedMode {
  if (mode === 'embed' || mode === 'link') return mode;
  return 'auto';
}

/**
 * Site display model (by sermon date, newest first):
 *  1. Newest  → embed on the page (unless live is on, or mode is “link only”)
 *  2. Previous (“last week”) → YouTube link only
 *  3. Older   → not listed individually; visitors use the channel archive link
 */
export function getSermonSiteSlots<T extends { id: string; embed_mode?: string | null }>(
  list: T[]
): { newest: T | null; previous: T | null; olderCount: number } {
  return {
    newest: list[0] ?? null,
    previous: list[1] ?? null,
    olderCount: Math.max(0, list.length - 2),
  };
}

/** Whether the newest sermon should show as an on-page embed. */
export function shouldEmbedNewestSermon(
  newest: { embed_mode?: string | null } | null | undefined,
  options: { liveStreamActive?: boolean } = {}
): boolean {
  if (!newest) return false;
  if (options.liveStreamActive) return false;

  const mode = normalizeEmbedMode(newest.embed_mode);
  if (mode === 'link') return false;
  // auto + embed both embed the newest
  return true;
}

/** @deprecated Prefer getSermonSiteSlots + shouldEmbedNewestSermon */
export function shouldEmbedSermonOnSite(
  sermon: { id: string; embed_mode?: string | null },
  list: { id: string; embed_mode?: string | null }[],
  options: { liveStreamActive?: boolean } = {}
): boolean {
  const { newest } = getSermonSiteSlots(list);
  if (!newest || newest.id !== sermon.id) return false;
  return shouldEmbedNewestSermon(newest, options);
}