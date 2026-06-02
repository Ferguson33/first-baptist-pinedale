"use client";

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

/**
 * Member Directory Page (dedicated view)
 * 
 * Embeds the official First Baptist Church Directory Google Doc (published version).
 * This page is read-only — the directory is maintained off-site in Google Docs by an administrator.
 * Protected to approved members only.
 *
 * This is one of the primary destinations linked from the user menu.
 *
 * To update the document, an administrator edits the master Google Doc and re-publishes it.
 * The embed URL format is: https://docs.google.com/document/d/e/<ID>/pub?embedded=true
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
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">OFFICIAL CHURCH DIRECTORY</div>
        <h1 className="text-4xl font-semibold tracking-tight mt-1">Member Directory</h1>
        <p className="text-[var(--color-stone)] text-sm mt-2 max-w-2xl">
          Current contact information for our church family. This is a published, read-only view of the master Google Doc. 
          Updates are made off-site by an administrator.
        </p>
      </div>

      <div className="bg-white border border-[var(--color-gold)]/10 rounded-2xl overflow-hidden shadow-sm">
        <iframe
          // Google Doc must be published first (File → Share → Publish to web)
          src="https://docs.google.com/document/d/e/16PgxfcMPyZqOO7WxdsXS5Uu4RXSl0Ywc4cN3KMM5oaA/pub?embedded=true"
          width="100%"
          height="1300"
          frameBorder="0"
          title="First Baptist Church Directory"
          className="w-full block"
          style={{ minHeight: '800px', border: 'none' }}
        />
      </div>

      <div className="mt-4 text-xs text-[var(--color-stone-light)] text-center">
        This directory is maintained off-site in Google Docs. The page is read-only for approved members.
      </div>
    </div>
  );
}
