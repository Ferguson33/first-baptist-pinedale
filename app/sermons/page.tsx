"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { shouldEmbedSermonOnSite } from '@/lib/sermon-display';
import type { Sermon } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/format-date';

function formatSermonDate(date: string) {
  return formatLocalDate(date, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SermonsPage() {
  const supabase = createClient();
  const { isApprovedMember, user, profile } = useAuth();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [liveVideoId, setLiveVideoId] = useState<string | null>(null);
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLiveModal, setShowLiveModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const { data: sermonsData, error: sermonsErr } = await supabase
          .from('sermons')
          .select('*')
          .order('date', { ascending: false });

        if (sermonsErr) {
          console.error('Error loading sermons:', sermonsErr);
          setError('Failed to load sermons.');
        } else {
          setSermons(sermonsData || []);
        }

        const { data: settingsData } = await supabase
          .from('sermon_settings')
          .select('live_video_id, live_stream_active')
          .eq('id', 1)
          .single();

        if (settingsData) {
          const id = extractVideoId(settingsData.live_video_id || '');
          setLiveVideoId(id);
          setLiveStreamActive(!!settingsData.live_stream_active && !!id);
        } else {
          setLiveVideoId(null);
          setLiveStreamActive(false);
        }
      } catch (e) {
        console.error('Sermons fetch error:', e);
        setError('Unable to load sermons data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function extractVideoId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    const match = urlOrId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : urlOrId.length === 11 ? urlOrId : null;
  }

  function getYouTubeEmbed(urlOrId: string, autoplay = 0) {
    const id = extractVideoId(urlOrId);
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=${autoplay}&rel=0`;
  }

  function getYouTubeWatchUrl(urlOrId: string): string | null {
    const id = extractVideoId(urlOrId);
    if (!id) return null;
    if (urlOrId.startsWith('http')) return urlOrId;
    return `https://www.youtube.com/watch?v=${id}`;
  }

  const publicSermons = sermons.filter((s) => s.is_public);
  const fullArchive = sermons;
  const memberLiveActive = liveStreamActive && !!liveVideoId;

  function renderEmbeddedSermon(sermon: Sermon) {
    const embedUrl = getYouTubeEmbed(sermon.video_url);

    return (
      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden">
        <div className="p-6 md:p-8 border-b">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--color-navy)]">{sermon.title}</h3>
            <p className="text-sm text-[var(--color-stone-light)] mt-1">
              {sermon.preacher} • {formatSermonDate(sermon.date)}
            </p>
          </div>
          {sermon.description && (
            <p className="mt-4 text-[var(--color-stone)]">{sermon.description}</p>
          )}
        </div>

        {embedUrl ? (
          <div className="aspect-video bg-black">
            <iframe
              src={embedUrl}
              title={sermon.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="p-8 text-center text-[var(--color-stone-light)]">
            Video link not available yet.
          </div>
        )}
      </div>
    );
  }

  function renderLinkedSermon(sermon: Sermon) {
    const watchUrl = getYouTubeWatchUrl(sermon.video_url);

    return (
      <div className="bg-white border border-[var(--color-gold)]/20 rounded-2xl p-5 md:p-6 hover:border-[var(--color-gold)]/50 transition">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-[var(--color-navy)]">{sermon.title}</h3>
            <p className="text-sm text-[var(--color-stone-light)] mt-1">
              {sermon.preacher} • {formatSermonDate(sermon.date)}
            </p>
            {sermon.description && (
              <p className="mt-2 text-sm text-[var(--color-stone)]">{sermon.description}</p>
            )}
          </div>

          {watchUrl ? (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[var(--color-navy)] text-[var(--color-navy)] text-sm font-semibold hover:bg-[var(--color-navy)] hover:text-white transition whitespace-nowrap shrink-0"
            >
              Watch on YouTube <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <span className="text-sm text-[var(--color-stone-light)]">Video link unavailable</span>
          )}
        </div>
      </div>
    );
  }

  function renderSermonList(
    list: Sermon[],
    options: { liveStreamActive?: boolean } = {}
  ) {
    if (list.length === 0) return null;

    return (
      <div className="space-y-8">
        {list.map((sermon) => {
          const embed = shouldEmbedSermonOnSite(sermon, list, {
            liveStreamActive: options.liveStreamActive,
          });

          return (
            <div key={sermon.id}>
              {embed ? renderEmbeddedSermon(sermon) : renderLinkedSermon(sermon)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">VERSE BY VERSE PREACHING</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Sermons</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)] max-w-2xl mx-auto">
          We believe in the power of God’s Word taught clearly and faithfully.
        </p>
      </div>

      {!isApprovedMember && user && profile?.role === 'pending' && (
        <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 mb-10 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-[var(--color-navy)] mb-2">Membership Pending Approval</h2>
          <p className="text-[var(--color-stone)]">
            Thank you! Your membership request is with the pastors. The full archive and live stream will be available here once approved.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm underline">Back to Homepage</Link>
        </div>
      )}

      {!isApprovedMember && (
        <div className="mb-12">
          <div className="mb-4">
            <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">MESSAGES FROM GOD&apos;S WORD</div>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)]">Featured Sermons</h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-[var(--color-stone-light)]">Loading sermons...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : publicSermons.length > 0 ? (
            renderSermonList(publicSermons)
          ) : (
            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10 text-center text-[var(--color-stone-light)]">
              More sermons coming soon.
            </div>
          )}
        </div>
      )}

      {isApprovedMember && (
        <>
          {liveStreamActive && liveVideoId && (
            <div className="mb-12">
              <div className="bg-red-50 border border-red-200 rounded-3xl p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold tracking-widest rounded">LIVE</div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-navy)]">Live Worship</h2>
                  </div>
                  <button
                    onClick={() => setShowLiveModal(true)}
                    className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition text-sm"
                  >
                    Join Live Now →
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="mb-4">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)]">Sermon Archive</h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[var(--color-stone-light)]">Loading archive...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : fullArchive.length > 0 ? (
              renderSermonList(fullArchive, { liveStreamActive: memberLiveActive })
            ) : (
              <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10 text-center">
                <p className="text-[var(--color-stone)]">No sermons posted yet. Check back soon.</p>
              </div>
            )}
          </div>
        </>
      )}

      {showLiveModal && liveVideoId && (
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

          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-5xl">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                <iframe
                  src={`https://www.youtube.com/embed/${liveVideoId}?autoplay=1&rel=0`}
                  title="Live Service"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <p className="text-center text-xs text-white/60 mt-3">Tap × to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}