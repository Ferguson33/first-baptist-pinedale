"use client";

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function MembersPortal() {
  const { profile, isApprovedMember, user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Members Portal</h1>
        <p className="mt-3">Please sign in to access the members area.</p>
        <Link href="/login" className="mt-6 inline-block bg-[var(--color-navy)] text-white px-8 py-3 rounded-full">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="mb-10">
        <div className="text-xs text-[var(--color-gold-dark)]">PRIVATE AREA</div>
        <h1 className="text-5xl tracking-tighter font-semibold">Welcome, {profile?.full_name?.split(' ')[0] || 'Friend'}.</h1>
        <p className="text-lg text-[var(--color-stone)] mt-2">Thank you for being part of our church family.</p>
      </div>

      {/* Official Church Directory - embedded directly from the Google Doc maintained by the office */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">OFFICIAL CHURCH DIRECTORY</div>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-3xl font-semibold tracking-tight mt-1">Member Directory</h2>
          <Link href="/members/directory" className="text-sm text-[var(--color-gold-dark)] hover:text-[var(--color-navy)] whitespace-nowrap">Open dedicated view →</Link>
        </div>
        <p className="text-[var(--color-stone)] text-sm mt-2 max-w-2xl">
          Current contact information for our church family. This document is maintained by the church office in Google Docs — updates appear here automatically for all approved members.
        </p>
      </div>

      <div className="bg-white border border-[var(--color-gold)]/10 rounded-2xl overflow-hidden shadow-sm mb-12">
        <iframe
          src="https://docs.google.com/document/d/e/16PgxfcMPyZqOO7WxdsXS5Uu4RXSl0Ywc4cN3KMM5oaA/pub?embedded=true"
          width="100%"
          height="1200"
          frameBorder="0"
          title="First Baptist Church Directory"
          className="w-full block"
          style={{ minHeight: '700px', border: 'none' }}
        />
      </div>

      {/* Prayer Bulletin - link to dedicated page (its Google Doc embed is on /prayer-bulletin) */}
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)] mb-3">PRAYER &amp; UPDATES</div>
        <Link 
          href="/prayer-bulletin" 
          className="block border bg-white p-7 sm:p-8 rounded-3xl hover:border-[var(--color-gold)]"
        >
          <div className="font-semibold text-2xl">Prayer Bulletin</div>
          <p className="text-sm mt-2">Current prayer focuses and updates (maintained in Google Doc by the pastoral team).</p>
          <div className="mt-6 text-xs text-[var(--color-gold-dark)]">VIEW THE BULLETIN →</div>
        </Link>
      </div>

      <div className="mt-10 text-xs text-[var(--color-stone-light)]">
        The full directory and prayer bulletin are available only to approved members. Both are powered by Google Docs maintained by the church office.
      </div>
    </div>
  );
}

