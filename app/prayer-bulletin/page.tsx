"use client";

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BookOpen, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Prayer Bulletin Page
 *
 * This page shows the church's Prayer Bulletin as a Google Doc embed.
 * It also links to the church's GroupMe prayer group.
 *
 * It requires an approved member login.
 *
 * The embed URL is now configurable in the Admin Dashboard (Sermons tab).
 */

export default function PrayerBulletin() {
  const { isApprovedMember, user, profile } = useAuth();
  const [bulletinUrl, setBulletinUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);

  // Fetch the configurable embed URL.
  // IMPORTANT: All hooks (useState, useEffect) must be called unconditionally
  // at the top of the component, before any early returns based on auth.
  // This prevents hook order mismatches during auth hydration/refresh,
  // which was the root cause of the React #310 "update while rendering"
  // crashes on the admin dashboard and now on this protected page.
  useEffect(() => {
    if (!isApprovedMember) {
      setLoadingUrl(false);
      setBulletinUrl(null);
      return;
    }

    async function loadBulletinUrl() {
      setLoadingUrl(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('sermon_settings')
          .select('prayer_bulletin_google_doc_url')
          .eq('id', 1)
          .single();

        if (data?.prayer_bulletin_google_doc_url) {
          setBulletinUrl(data.prayer_bulletin_google_doc_url);
        }
      } catch (e) {
        console.error('Failed to load prayer bulletin URL:', e);
      } finally {
        setLoadingUrl(false);
      }
    }
    loadBulletinUrl();
  }, [isApprovedMember]);

  if (!isApprovedMember) {
    if (user && profile?.role === 'pending') {
      return (
        <div className="max-w-md mx-auto text-center py-20 px-6">
          <h2 className="font-semibold text-2xl">Membership Pending Approval</h2>
          <p className="mt-3">Thank you for joining! The Prayer Bulletin will be available here once the pastors approve your membership.</p>
          <Link href="/" className="mt-6 inline-block underline">Back to homepage</Link>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <h2 className="font-semibold text-2xl">Private Prayer Bulletin</h2>
        <p className="mt-3">This page is only available to approved church members.</p>
        <Link href="/login" className="mt-6 inline-block underline">Sign in with your member account</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">FOR OUR CHURCH FAMILY</div>
        <h1 className="text-4xl font-semibold tracking-tight">Prayer Bulletin</h1>
        <p className="text-[var(--color-stone)] mt-2 max-w-2xl">
          Current prayer focuses, updates, and requests for our church family. This content is maintained by the pastoral team.
        </p>
      </div>

      {/* GroupMe Section - moved to top per request */}
      <div className="bg-[var(--color-cream)] border border-[var(--color-gold)]/30 rounded-3xl p-8 md:p-10 mb-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-7 h-7 text-[var(--color-gold-dark)]" />
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-navy)]">Join the Prayer Group</h2>
            </div>
            <p className="text-[var(--color-stone)] max-w-prose">
              Connect with the church family on GroupMe for real-time prayer requests, encouragement, and updates throughout the week.
            </p>
          </div>

          <a
            href="https://groupme.com/join_group/103694184/CshAkELQ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[var(--color-navy)] hover:bg-[var(--color-navy-dark)] text-white rounded-2xl font-semibold transition-colors whitespace-nowrap"
          >
            Join on GroupMe <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="mt-5 text-xs text-[var(--color-stone-light)]">
          Private group for First Baptist Church of Pinedale members &amp; friends.
        </div>
      </div>

      {loadingUrl ? (
        <div className="text-center py-12 text-[var(--color-stone-light)]">Loading Prayer Bulletin...</div>
      ) : bulletinUrl ? (
        <div className="bg-white border border-[var(--color-gold)]/10 rounded-3xl overflow-hidden shadow-sm mb-10">
          <iframe
            src={bulletinUrl}
            width="100%"
            height="1200"
            frameBorder="0"
            title="Prayer Bulletin"
            className="w-full block"
            style={{ minHeight: '900px', border: 'none' }}
          />
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-[var(--color-gold)]/30 bg-[var(--color-cream)] p-6 text-center">
          <div className="font-semibold text-[var(--color-navy)] mb-2">Prayer Bulletin — Coming Soon</div>
          <p className="text-sm text-[var(--color-stone)]">
            The Prayer Bulletin embed is not yet configured. An admin can set it in the Sermons tab of the dashboard.
          </p>
        </div>
      )}

      <div className="text-xs text-center mt-8 text-[var(--color-stone-light)]">
        Updates to the bulletin are made in the Google Doc by the church office. The embed URL can be updated in the Admin Dashboard.
      </div>
    </div>
  );
}
