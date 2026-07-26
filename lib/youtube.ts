/** Extract an 11-character YouTube video ID from a URL or bare ID string. */
export function extractYouTubeVideoId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;

  // Normalize paste artifacts (smart quotes, zero-width spaces, extra whitespace)
  const trimmed = urlOrId
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  if (!trimmed) return null;

  // Bare ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/|v\/|attribution_link\?.*v%3D))([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /\/([a-zA-Z0-9_-]{11})(?:[?&#]|$)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1] && match[1].length === 11) return match[1];
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = 0): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://firstbaptistpinedale.org';

  const params = new URLSearchParams({
    autoplay: String(autoplay),
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    origin,
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Standard YouTube thumbnail URL for a video ID (no external placeholder service). */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'hq' | 'mq' | 'sd' | 'max' = 'hq'): string {
  const map = {
    max: 'maxresdefault',
    sd: 'sddefault',
    hq: 'hqdefault',
    mq: 'mqdefault',
  } as const;
  return `https://i.ytimg.com/vi/${videoId}/${map[quality]}.jpg`;
}

/** Direct watch URL for live broadcasts (works when site embedding is disabled). */
export function getYouTubeLiveWatchUrl(videoId: string): string {
  return `https://www.youtube.com/live/${videoId}`;
}