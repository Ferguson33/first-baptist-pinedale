"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const mockMembers = [
  { id: 1, name: "Ted & Teresa York", photo: "https://picsum.photos/id/1005/200/200", phone: "(307) 367-4401", email: "ted@firstbaptistpinedale.org", notes: "Lead Pastor" },
  { id: 2, name: "Heath & Tessa Holmes", photo: "https://picsum.photos/id/1009/200/200", phone: "(307) 367-4567", email: "Firstbaptist646@gmail.com", notes: "Youth & Assistant Pastor" },
  { id: 3, name: "Robert & Linda Thompson", photo: "https://picsum.photos/id/1011/200/200", phone: "(307) 555-0182", notes: "Deacon" },
  { id: 4, name: "Mike & Carol Reynolds", photo: "https://picsum.photos/id/1006/200/200", phone: "(307) 367-9911" },
  { id: 5, name: "The Anderson Family", photo: "https://picsum.photos/id/1012/200/200", notes: "New members • 2024" },
];

export default function MemberDirectory() {
  const { isApprovedMember, user } = useAuth();
  const [search, setSearch] = useState("");

  if (!isApprovedMember) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <h2 className="font-semibold text-2xl">Private Directory</h2>
        <p className="mt-3">This page is only available to approved church members.</p>
        <Link href="/login" className="mt-6 inline-block underline">Sign in with your member account</Link>
      </div>
    );
  }

  const filtered = mockMembers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.notes && m.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Church Family Directory</h1>
      <p className="text-sm text-[var(--color-stone-light)] mt-1">For the private use of members only. Please keep this information confidential.</p>

      <input 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        placeholder="Search by name or notes..." 
        className="mt-6 w-full border border-[var(--color-gold)]/30 px-5 py-3 rounded-2xl" 
      />

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {filtered.map(m => (
          <div key={m.id} className="member-card flex gap-5 bg-white border p-5 rounded-2xl">
            <img src={m.photo} className="w-16 h-16 rounded-full object-cover flex-shrink-0" alt="" />
            <div className="min-w-0">
              <div className="font-semibold text-lg tracking-tight">{m.name}</div>
              {m.notes && <div className="text-xs text-[var(--color-gold-dark)]">{m.notes}</div>}
              {m.phone && <div className="text-sm mt-2">{m.phone}</div>}
              {m.email && <a href={`mailto:${m.email}`} className="text-sm text-[var(--color-gold-dark)] hover:underline">{m.email}</a>}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-center mt-10 text-[var(--color-stone-light)]">Is someone missing or information out of date? Let the office know and we’ll update the directory promptly.</div>
    </div>
  );
}
