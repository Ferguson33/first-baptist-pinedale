"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import {
  YOUTUBE_CHANNEL_URL,
  getSermonSiteSlots,
  shouldEmbedNewestSermon,
} from '@/lib/sermon-display';
import type { Sermon } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/format-date';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/youtube';
import LiveStreamSection from '@/components/LiveStreamSection';

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
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const liveRes = await fetch('/api/sermons/live', { credentials: 'include', cache: 'no-store' });
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          setLiveStreamActive(!!liveData.active);
        } else {
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

  function getYouTubeEmbed(urlOrId: string, autoplay = 0) {
    const id = extractYouTubeVideoId(urlOrId);
    if (!id) return null;
    return getYouTubeEmbedUrl(id, autoplay);
  }

  function getYouTubeWatchLink(urlOrId: string): string | null {
    const id = extractYouTubeVideoId(urlOrId);
    if (!id) return null;
    if (urlOrId.startsWith('http')) return urlOrId;
    return getYouTubeWatchUrl(id);
  }

  const publicSermons = sermons.filter((s) => s.is_public);
  const fullArchive = sermons;
  const memberLiveActive = liveStreamActive;

  function renderEmbeddedSermon(sermon: Sermon, eyebrow?: string) {
    const embedUrl = getYouTubeEmbed(sermon.video_url);

    return (
      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden">
        <div className="p-6 md:p-8 border-b">
          <div>
            {eyebrow && (
              <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)] mb-2">
                {eyebrow}
              </div>
            )}
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

  function renderLinkedSermon(sermon: Sermon, eyebrow?: string) {
    const watchUrl = getYouTubeWatchLink(sermon.video_url);

    return (
      <div className="bg-white border border-[var(--color-gold)]/20 rounded-2xl p-5 md:p-6 hover:border-[var(--color-gold)]/50 transition">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && (
              <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)] mb-2">
                {eyebrow}
              </div>
            )}
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

  function renderArchiveChannelLink() {
    return (
      <div className="bg-[var(--color-cream)] border border-[var(--color-gold)]/25 rounded-2xl p-6 md:p-8 text-center">
        <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)] mb-2">
          Older messages
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-navy)]">
          Archived sermons on YouTube
        </h3>
        <p className="mt-2 text-sm text-[var(--color-stone)] max-w-md mx-auto">
          Browse the full collection of past messages on our church YouTube channel.
        </p>
        <a
          href={YOUTUBE_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--color-navy)] text-white text-sm font-semibold hover:bg-[var(--color-navy-dark)] transition"
        >
          Open YouTube archive <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  /**
   * Display model:
   *  1. Newest sermon → embed
   *  2. Previous sermon (“last week”) → YouTube link
   *  3. Everything older → single channel archive link (not listed one-by-one)
   */
  function renderSermonList(
    list: Sermon[],
    options: { liveStreamActive?: boolean } = {}
  ) {
    if (list.length === 0) return null;

    const { newest, previous } = getSermonSiteSlots(list);
    if (!newest) return null;

    const embedNewest = shouldEmbedNewestSermon(newest, {
      liveStreamActive: options.liveStreamActive,
    });

    return (
      <div className="space-y-8">
        {embedNewest
          ? renderEmbeddedSermon(newest, 'Latest sermon')
          : renderLinkedSermon(newest, 'Latest sermon')}

        {previous && renderLinkedSermon(previous, "Last week's sermon")}

        {renderArchiveChannelLink()}
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

      <LiveStreamSection />

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
          <div>
            <div className="mb-4">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)]">Sermons</h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-[var(--color-stone-light)]">Loading sermons...</div>
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

    </div>
  );
}
