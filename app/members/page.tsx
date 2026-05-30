"use client";

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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

      {/* Three main cards - evenly spaced on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link href="/members/directory" className="block border bg-white p-8 rounded-3xl hover:border-[var(--color-gold)] h-full">
          <div className="font-semibold text-2xl">Member Directory</div>
          <p className="text-sm mt-2">Official church directory (Google Doc maintained by the office).</p>
          <div className="mt-6 text-xs text-[var(--color-gold-dark)]">ONLY VISIBLE TO APPROVED MEMBERS →</div>
        </Link>

        <Link href="/prayer-wall" className="block border bg-white p-8 rounded-3xl hover:border-[var(--color-gold)] h-full">
          <div className="font-semibold text-2xl">Prayer Wall</div>
          <p className="text-sm mt-2">Submit and view prayer requests from the body.</p>
        </Link>

        <Link href="/members/profile" className="block border bg-white p-8 rounded-3xl hover:border-[var(--color-gold)] h-full">
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

      {/* Registered Members Section - shows who has actually joined the site */}
      <div className="mt-12">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">ON THE WEBSITE</div>
            <h2 className="text-2xl font-semibold tracking-tight">Registered Members</h2>
          </div>
          <div className="text-sm text-[var(--color-stone-light)]">People who have created accounts</div>
        </div>

        <RegisteredMembersList />
      </div>
    </div>
  );
}

// Simple component to show who has actually joined the website
function RegisteredMembersList() {
  const [members, setMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadMembers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .in('role', ['approved', 'admin'])
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error && data) {
        setMembers(data);
      }
      setLoading(false);
    }
    loadMembers();
  }, []);

  if (loading) {
    return <div className="text-sm text-[var(--color-stone-light)]">Loading members...</div>;
  }

  if (members.length === 0) {
    return <div className="text-sm text-[var(--color-stone-light)]">No members have joined yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.map((m) => (
        <div key={m.id} className="bg-white border rounded-2xl px-4 py-3 text-sm">
          <div className="font-medium">{m.full_name}</div>
          <div className="text-[10px] text-[var(--color-stone-light)] mt-0.5">
            {m.role === 'admin' ? 'Pastor' : 'Member'} • Joined {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      ))}
    </div>
  );
}

