"use client";

import { useEffect, useRef, useState } from 'react';
import { getYouTubeLiveWatchUrl } from '@/lib/youtube';

type YTPlayer = { destroy: () => void };

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }

  return youtubeApiPromise;
}

/** YouTube error codes 101 and 150 mean embedding is disabled by the video owner. */
function isEmbedDisabledError(code: number): boolean {
  return code === 101 || code === 150;
}

type LiveYouTubePlayerProps = {
  videoId: string;
  onEmbedBlocked?: () => void;
};

export default function LiveYouTubePlayer({ videoId, onEmbedBlocked }: LiveYouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  const watchUrl = getYouTubeLiveWatchUrl(videoId);

  useEffect(() => {
    let cancelled = false;

    async function initPlayer() {
      if (!containerRef.current) return;

      try {
        await loadYouTubeIframeApi();
        if (cancelled || !containerRef.current || !window.YT?.Player) {
          if (!cancelled) setInitFailed(true);
          return;
        }

        const origin =
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://firstbaptistpinedale.org';

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin,
          },
          events: {
            onError: (event) => {
              if (isEmbedDisabledError(event.data)) {
                setEmbedBlocked(true);
                onEmbedBlocked?.();
              } else {
                setInitFailed(true);
              }
            },
          },
        });
      } catch {
        if (!cancelled) setInitFailed(true);
      }
    }

    setEmbedBlocked(false);
    setInitFailed(false);
    initPlayer();

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, onEmbedBlocked]);

  if (embedBlocked || initFailed) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/90 px-6 text-center gap-4">
        <p className="text-base">
          {embedBlocked
            ? 'This stream cannot play on our website because embedding is turned off in YouTube.'
            : 'The player could not load here.'}
        </p>
        <p className="text-sm text-white/70">
          You can still watch on YouTube — sign in there if the stream is unlisted.
        </p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm"
        >
          Watch on YouTube
        </a>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}