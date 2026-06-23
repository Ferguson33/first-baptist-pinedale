"use client";

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Nursery Schedule Page — Google Doc embed for approved members.
 * Maintained by the nursery coordinator.
 */

export default function NurserySchedule() {
  const { isApprovedMember, user, profile } = useAuth();
  const [scheduleUrl, setScheduleUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);

  // Fetch the configurable embed URL.
  // All hooks are called at the top (before any early returns) to prevent
  // React hook ordering issues on auth state changes / refreshes.
  useEffect(() => {
    if (!isApprovedMember) {
      setLoadingUrl(false);
      setScheduleUrl(null);
      return;
    }

    async function loadScheduleUrl() {
      setLoadingUrl(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('sermon_settings')
          .select('nursery_schedule_google_doc_url')
          .eq('id', 1)
          .single();

        if (data?.nursery_schedule_google_doc_url) {
          setScheduleUrl(data.nursery_schedule_google_doc_url);
        }
      } catch (e) {
        console.error('Failed to load nursery schedule URL:', e);
      } finally {
        setLoadingUrl(false);
      }
    }
    loadScheduleUrl();
  }, [isApprovedMember]);

  if (!isApprovedMember) {
    if (user && profile?.role === 'pending') {
      return (
        <div className="max-w-md mx-auto text-center py-20 px-6">
          <h2 className="font-semibold text-2xl">Membership Pending Approval</h2>
          <p className="mt-3">Thank you for joining! The Nursery Schedule will be available here once the pastors approve your membership.</p>
          <Link href="/" className="mt-6 inline-block underline">Back to homepage</Link>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <h2 className="font-semibold text-2xl">Private Nursery Schedule</h2>
        <p className="mt-3">This page is only available to approved church members.</p>
        <Link href="/login" className="mt-6 inline-block underline">Sign in with your member account</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">FOR OUR CHURCH FAMILY</div>
        <h1 className="text-4xl font-semibold tracking-tight">Nursery Schedule</h1>
        <p className="text-[var(--color-stone)] mt-2 max-w-2xl">
          Current nursery volunteer schedule and details. This content is maintained by the nursery coordinator.
        </p>
      </div>

      {loadingUrl ? (
        <div className="text-center py-12 text-[var(--color-stone-light)]">Loading Nursery Schedule...</div>
      ) : scheduleUrl ? (
        <div className="mb-10">
          {/* Nice header "window" thanking volunteers + KJV verse */}
          <div className="bg-[var(--color-cream)] border border-[var(--color-gold)]/30 rounded-3xl p-8 md:p-10 mb-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)] mb-4">
              Thank You, Nursery Volunteers!
            </h2>
            <p className="text-[var(--color-stone)] max-w-prose mx-auto text-lg leading-relaxed">
              We are deeply grateful for your faithful and joyful service in caring for our little ones. 
              Your willingness to serve allows families to worship together in peace and focus on the Lord.
            </p>
            <p className="mt-6 text-[var(--color-stone)] italic text-lg max-w-prose mx-auto">
              “And the King shall answer and say unto them, Verily I say unto you, Inasmuch as ye have done it unto one of the least of these my brethren, ye have done it unto me.”
              <br />
              — Matthew 25:40 (KJV)
            </p>
          </div>

          {/* Embed window */}
          <div className="bg-white border border-[var(--color-gold)]/10 rounded-3xl overflow-hidden shadow-sm">
            <iframe
              src={scheduleUrl}
              width="100%"
              height="1200"
              frameBorder="0"
              title="Nursery Schedule"
              className="w-full block"
              style={{ minHeight: '900px', border: 'none' }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-[var(--color-gold)]/30 bg-[var(--color-cream)] p-6 text-center">
          <div className="font-semibold text-[var(--color-navy)] mb-2">Nursery Schedule Temporarily Unavailable</div>
          <p className="text-sm text-[var(--color-stone)]">
            The schedule is not displaying right now. Please contact the church office at (307) 367-4567 for the current nursery rotation.
          </p>
        </div>
      )}

      <div className="text-xs text-center mt-8 text-[var(--color-stone-light)]">
        The nursery schedule is maintained by the nursery coordinator in Google Docs.
      </div>
    </div>
  );
}
