/** Extract an 11-character YouTube video ID from a URL or bare ID string. */
export function extractYouTubeVideoId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;

  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  if (!trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed.length === 11 ? trimmed : null;
  }

  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = 0): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&rel=0`;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}