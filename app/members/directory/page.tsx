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
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Very clean page — the Google Doc embed is the only content */}
      <div className="bg-white border border-[var(--color-gold)]/10 rounded-2xl overflow-hidden shadow-sm">
        <iframe
          // TODO: Replace PLACEHOLDER with your actual Google Doc "Publish to web" embed URL
          src="https://docs.google.com/document/d/e/PLACEHOLDER_PUBLISH_LINK/pub?embedded=true"
          width="100%"
          height="1300"
          frameBorder="0"
          title="Member Directory"
          className="w-full block"
          style={{ minHeight: '800px', border: 'none' }}
        />
      </div>
    </div>
  );
}
