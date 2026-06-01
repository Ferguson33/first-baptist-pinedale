"use client";

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function MemberProfilePage() {
  const { profile, user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
        <p className="mt-3">Please sign in to access this page.</p>
        <Link href="/login" className="mt-6 inline-block bg-[var(--color-navy)] text-white px-8 py-3 rounded-full">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">MEMBERS AREA</div>
        <h1 className="text-4xl font-semibold tracking-tight mt-2">Profile</h1>
      </div>

      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10">
        <p className="text-lg text-[var(--color-stone)]">
          Profile editing is no longer available on the website.
        </p>

        <div className="mt-8 text-[var(--color-stone)] space-y-3 text-sm leading-relaxed">
          <p>
            All member directory information is now maintained in the official Google Doc.
          </p>
          <p>
            Your basic account (name and email) is stored securely in our system and is only used for login and approval purposes.
          </p>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/members" 
            className="px-8 py-3 bg-[var(--color-navy)] text-white rounded-2xl font-medium"
          >
            View Member Directory
          </Link>
          <Link 
            href="/members/directory" 
            className="px-8 py-3 border border-[var(--color-gold)]/40 hover:bg-[var(--color-cream)] rounded-2xl font-medium"
          >
            Dedicated directory page
          </Link>
        </div>
      </div>

      {profile && (
        <div className="mt-8 text-xs text-[var(--color-stone-light)]">
          Signed in as {profile.full_name} • {profile.email}
        </div>
      )}
    </div>
  );
}
