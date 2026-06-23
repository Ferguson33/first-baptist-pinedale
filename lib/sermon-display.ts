export type SermonEmbedMode = 'auto' | 'embed' | 'link';

export const SERMON_EMBED_MODE_LABELS: Record<SermonEmbedMode, string> = {
  auto: 'Automatic (newest embeds)',
  embed: 'Always embed on site',
  link: 'YouTube link only',
};

export function normalizeEmbedMode(mode?: string | null): SermonEmbedMode {
  if (mode === 'embed' || mode === 'link') return mode;
  return 'auto';
}

export function shouldEmbedSermonOnSite(
  sermon: { id: string; embed_mode?: string | null },
  list: { id: string; embed_mode?: string | null }[],
  options: { liveStreamActive?: boolean } = {}
): boolean {
  const mode = normalizeEmbedMode(sermon.embed_mode);

  if (mode === 'link') return false;
  if (mode === 'embed') return true;

  if (options.liveStreamActive) return false;

  const newestAuto = list.find((item) => normalizeEmbedMode(item.embed_mode) === 'auto');
  return newestAuto?.id === sermon.id;
}