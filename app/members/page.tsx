"use client";

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
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div className="mb-10">
        <div className="text-xs text-[var(--color-gold-dark)]">PRIVATE AREA</div>
        <h1 className="text-5xl tracking-tighter font-semibold">Welcome, {profile?.full_name?.split(' ')[0] || 'Friend'}.</h1>
        <p className="text-lg text-[var(--color-stone)] mt-2">Thank you for being part of our church family.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Link href="/members/directory" className="block border bg-white p-8 rounded-3xl hover:border-[var(--color-gold)]">
          <div className="font-semibold text-2xl">Member Directory</div>
          <p className="text-sm mt-2">Searchable list of our church family with contact info and photos.</p>
          <div className="mt-6 text-xs text-[var(--color-gold-dark)]">ONLY VISIBLE TO APPROVED MEMBERS →</div>
        </Link>

        <Link href="/prayer-wall" className="block border bg-white p-8 rounded-3xl hover:border-[var(--color-gold)]">
          <div className="font-semibold text-2xl">Prayer Wall</div>
          <p className="text-sm mt-2">Submit and view prayer requests from the body.</p>
        </Link>

        <Link href="/members/profile" className="block border bg-white p-8 rounded-3xl hover:border-[var(--color-gold)]">
          <div className="font-semibold text-2xl">My Profile</div>
          <div className="text-sm mt-4 space-y-1 text-[var(--color-stone)]">
            <div><span className="font-medium">Name:</span> {profile?.full_name}</div>
            <div><span className="font-medium">Email:</span> {profile?.email}</div>
            <div><span className="font-medium">Status:</span> {profile?.role === 'approved' ? 'Approved Member' : profile?.role}</div>
          </div>
          <div className="text-xs mt-6 text-[var(--color-gold-dark)] font-medium">
            {profile?.role === 'pending' 
              ? "Complete your profile while waiting for approval →" 
              : "Update your photo, birthdate, anniversary, and contact info →"}
          </div>
        </Link>
      </div>
    </div>
  );
}
