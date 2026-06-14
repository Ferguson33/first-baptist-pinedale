"use client";

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Member Directory Page (dedicated view)
 * 
 * Provides a link to the official First Baptist Church Directory Google Doc.
 * This page is read-only — the directory is maintained off-site in Google Docs by an administrator.
 * Protected to approved members only.
 *
 * This is one of the primary destinations linked from the user menu.
 *
 * To update the document, an administrator edits the master Google Doc directly.
 */

export default function MemberDirectory() {
  const { isApprovedMember, user, profile } = useAuth();

  const inner = () => {
    if (!isApprovedMember) {
      // Non-blocking for pending users: they are logged in but waiting approval.
      // Show friendly message instead of generic "sign in".
      if (user && profile?.role === 'pending') {
        return (
          <div className="max-w-md mx-auto text-center py-20 px-6">
            <h2 className="font-semibold text-2xl">Membership Pending Approval</h2>
            <p className="mt-3">Thank you for signing up! Your request is with the pastors for review.</p>
            <p className="mt-2 text-sm text-[var(--color-stone-light)]">
              You'll get an update (and full access to the Directory + Prayer Bulletin) once approved.
            </p>
            <Link href="/" className="mt-6 inline-block underline">Return to homepage</Link>
          </div>
        );
      }

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
            Current contact information for our church family. The directory is maintained off-site in Google Docs by an administrator.
          </p>
        </div>

        <div className="bg-white border border-[var(--color-gold)]/10 rounded-2xl p-10 text-center shadow-sm">
          <p className="text-[var(--color-stone)] mb-6">
            The Member Directory is maintained in Google Docs by the church office.
          </p>

          <a
            href="https://docs.google.com/document/d/16PgxfcMPyZqOO7WxdsXS5Uu4RXSl0Ywc4cN3KMM5oaA/edit?tab=t.0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-3 bg-[var(--color-navy)] hover:bg-black text-white rounded-full font-semibold transition"
          >
            Open Member Directory →
          </a>

          <p className="mt-6 text-xs text-[var(--color-stone-light)]">
            Opens in a new tab. This document is for approved members only.
          </p>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      {inner()}
    </ErrorBoundary>
  );
}
