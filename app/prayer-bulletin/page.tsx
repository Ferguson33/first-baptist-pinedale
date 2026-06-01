"use client";

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { BookOpen, MessageCircle } from 'lucide-react';

/**
 * Prayer Bulletin Page
 *
 * This page shows the church's Prayer Bulletin as a Google Doc embed.
 * It also links to the church's GroupMe prayer group.
 *
 * It requires an approved member login.
 *
 * The Google Doc embed URL still needs to be filled in (see TODO below).
 */

export default function PrayerBulletin() {
  const { isApprovedMember } = useAuth();

  if (!isApprovedMember) {
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

      {/* Embedded Google Doc - main content area */}
      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden shadow-sm mb-10">
        <iframe
          // TODO: Replace PLACEHOLDER with the actual published Google Doc embed URL for the Prayer Bulletin
          src="https://docs.google.com/document/d/e/PLACEHOLDER_PRAYER_BULLETIN/pub?embedded=true"
          width="100%"
          height="1100"
          frameBorder="0"
          title="Prayer Bulletin"
          className="w-full block"
          style={{ minHeight: '700px', border: 'none' }}
        />
      </div>

      <div className="text-xs text-center mt-8 text-[var(--color-stone-light)]">
        Updates to the bulletin are made in the Google Doc by the church office.
      </div>
    </div>
  );
}
