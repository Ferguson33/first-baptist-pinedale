"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getYouTubeLiveWatchUrl } from '@/lib/youtube';
import LiveYouTubePlayer from '@/components/LiveYouTubePlayer';

type LiveApiResponse = {
  active: boolean;
  isPublic: boolean;
  canWatch: boolean;
  videoId: string | null;
  isLoggedIn?: boolean;
  memberRole?: string | null;
  error?: string;
};

export default function LiveStreamSection() {
  const { loading: authLoading, user } = useAuth();
  const [live, setLive] = useState<LiveApiResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function loadLive(background = false) {
      if (!background) {
        setLiveLoading(true);
        setLiveError(null);
      }

      try {
        const res = await fetch('/api/sermons/live', { credentials: 'include', cache: 'no-store' });
        const data: LiveApiResponse = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load live stream.');
        }

        if (!cancelled) {
          setLive(data);
          if (!data.active) {
            setShowLiveModal(false);
          }
        }
      } catch (err) {
        console.error('Live stream fetch error:', err);
        if (!cancelled && !background) {
          setLiveError('Unable to check live stream status right now.');
          setLive(null);
        }
      } finally {
        if (!cancelled && !background) {
          setLiveLoading(false);
        }
      }
    }

    loadLive(false);
    const interval = setInterval(() => loadLive(true), 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authLoading, user?.id]);

  if (authLoading || (liveLoading && !live)) {
    return (
      <div className="mb-12 rounded-3xl border border-[var(--color-gold)]/20 bg-white/60 p-6 text-center text-sm text-[var(--color-stone-light)]">
        Checking live stream status…
      </div>
    );
  }

  if (liveError) {
    return (
      <div className="mb-12 rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {liveError}
      </div>
    );
  }

  if (!live?.active) {
    return null;
  }

  const pendingApproval = live.isLoggedIn && live.memberRole === 'pending';

  return (
    <>
      <div className="mb-12">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold tracking-widest rounded">LIVE</div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-navy)]">Live Worship</h2>
            </div>

            {live.canWatch && live.videoId ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={getYouTubeLiveWatchUrl(live.videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition text-sm"
                >
                  Watch on YouTube →
                </a>
                <button
                  onClick={() => setShowLiveModal(true)}
                  className="inline-flex items-center justify-center px-6 py-3 border border-red-600 text-red-700 hover:bg-red-50 rounded-full font-semibold transition text-sm"
                >
                  Watch Here
                </button>
              </div>
            ) : pendingApproval ? (
              <p className="text-sm text-[var(--color-stone)]">
                This live broadcast is for approved members. Your membership request is with the pastors — check back after approval.
              </p>
            ) : (
              <div className="text-sm text-[var(--color-stone)] space-y-3">
                <p>
                  This live broadcast is available to members only. Please log in to watch.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 bg-[var(--color-navy)] text-white rounded-full font-semibold transition text-sm"
                >
                  Sign In to Watch
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLiveModal && live.videoId && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex flex-col" onClick={() => setShowLiveModal(false)}>
          <div className="flex-shrink-0 h-14 flex items-center justify-between px-4 bg-black/70 z-[80]">
            <div className="text-white text-sm font-medium flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded">LIVE</span> Live Service
            </div>
            <button
              onClick={() => setShowLiveModal(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[var(--color-navy)] text-3xl font-bold hover:bg-[var(--color-gold)] hover:text-white"
              aria-label="Close live player"
            >
              ×
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-5xl">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                <LiveYouTubePlayer videoId={live.videoId} />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                <a
                  href={getYouTubeLiveWatchUrl(live.videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm"
                >
                  Watch on YouTube
                </a>
                <p className="text-xs text-white/60">Tap × to close</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}