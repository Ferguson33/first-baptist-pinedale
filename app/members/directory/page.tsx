"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface DirectoryMember {
  id: string;
  name: string;
  photo: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export default function MemberDirectory() {
  const { isApprovedMember, user } = useAuth();
  const [search, setSearch] = useState("");
  const [realMembers, setRealMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Featured pastoral couples (always shown with nice photos)
  const featuredCouples: DirectoryMember[] = [
    { 
      id: 'york', 
      name: "Ted & Teresa York", 
      photo: "/images/pastors/york-couple.jpg", 
      phone: "(307) 367-4567", 
      email: "Firstbaptist646@gmail.com", 
      notes: "Lead Pastor & Women’s Ministry" 
    },
    { 
      id: 'holmes', 
      name: "Heath & Tessa Holmes", 
      photo: "/images/pastors/holmes-couple.jpg", 
      phone: "(307) 367-4567", 
      email: "Firstbaptist646@gmail.com", 
      notes: "Assistant Pastor / Youth & Music Ministry" 
    },
  ];

  useEffect(() => {
    if (!isApprovedMember) return;

    async function fetchApprovedMembers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, photo_url, role')
        .in('role', ['approved', 'admin'])
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error loading directory members:', error);
      } else if (data) {
        const formatted: DirectoryMember[] = data
          .filter(p => p.full_name) // only show people who have a name set
          .map(p => ({
            id: p.id,
            name: p.full_name,
            photo: p.photo_url || '/images/pastors/york-couple.jpg', // fallback photo
            phone: p.phone || undefined,
            email: p.email,
            notes: undefined,
          }));

        setRealMembers(formatted);
      }
      setLoading(false);
    }

    fetchApprovedMembers();
  }, [isApprovedMember]);

  // Combine featured couples + real members from Supabase
  const pastoralNameChecks = ["york", "holmes"];
  const otherMembers = realMembers.filter(m => 
    !pastoralNameChecks.some(check => m.name.toLowerCase().includes(check))
  );

  const allMembers = [...featuredCouples, ...otherMembers];

  const filtered = allMembers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.notes && m.notes.toLowerCase().includes(search.toLowerCase()))
  );

  if (!isApprovedMember) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <h2 className="font-semibold text-2xl">Private Directory</h2>
        <p className="mt-3">This page is only available to approved church members.</p>
        <Link href="/login" className="mt-6 inline-block underline">Sign in with your member account</Link>
      </div>
    );
  }

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

      {loading ? (
        <div className="mt-8 text-center text-[var(--color-stone-light)]">Loading directory...</div>
      ) : (
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
      )}

      <div className="text-xs text-center mt-10 text-[var(--color-stone-light)]">Is someone missing or information out of date? Let the office know and we’ll update the directory promptly.</div>
    </div>
  );
}
