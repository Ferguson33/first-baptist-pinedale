"use client";

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

/**
 * Member Directory Page
 * 
 * This page is now a simple, isolated Google Doc embed.
 * It does NOT pull data from Supabase or interact with the profile/family system.
 * 
 * Replace the src below with your actual Google Doc "Publish to web" embed URL.
 * Example format: https://docs.google.com/document/d/e/XXXXX/pub?embedded=true
 */

export default function MemberDirectory() {
  const { isApprovedMember } = useAuth();

  if (!isApprovedMember) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <h2 className="font-semibold text-2xl">Private Directory</h2>
        <p className="mt-3">This page is only available to approved church members.</p>
        <Link href="/login" className="mt-6 inline-block underline">Sign in with your member account</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">OFFICIAL</div>
        <h1 className="text-4xl font-semibold tracking-tight">Member Directory</h1>
        <p className="text-sm text-[var(--color-stone-light)] mt-1">
          Maintained by the church office. For approved members only.
        </p>
      </div>

      {/* Google Doc Embed - isolated, no data connection to the rest of the site */}
      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden shadow-sm">
        <iframe
          // TODO: Replace this with your actual published Google Doc embed URL
          src="https://docs.google.com/document/d/e/PLACEHOLDER_PUBLISH_LINK/pub?embedded=true"
          width="100%"
          height="1400"
          frameBorder="0"
          title="Church Member Directory"
          className="w-full block"
          style={{ minHeight: '900px', border: 'none' }}
        />
      </div>

      <div className="text-xs text-center mt-6 text-[var(--color-stone-light)]">
        This is the official directory. Updates are made in the Google Doc by the office.
      </div>
    </div>
  );
}
