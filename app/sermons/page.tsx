"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string;
  video_url: string;
  description?: string;
}

export default function SermonsPage() {
  const { isApprovedMember, user } = useAuth();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApprovedMember) {
      setLoading(false);
      return;
    }

    async function fetchSermons() {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading sermons:', error);
      } else {
        setSermons(data || []);
      }
      setLoading(false);
    }

    fetchSermons();
  }, [isApprovedMember]);

  // Public view - not logged in or not approved
  if (!isApprovedMember) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">VERSE BY VERSE PREACHING</div>
          <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Sermons</h1>
          <p className="mt-4 text-xl text-[var(--color-stone)] max-w-2xl mx-auto">
            We believe in the power of God’s Word taught clearly and faithfully.
          </p>
        </div>

        <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10 md:p-14 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-[var(--color-navy)] mb-4">Member-Only Access</h2>
            <p className="text-[var(--color-stone)]">
              Live Sunday services and our archive of Pastor Ted’s verse-by-verse teaching are available to approved members.
            </p>
            <Link 
              href="/login" 
              className="mt-6 inline-flex items-center justify-center gap-2 px-8 py-3 bg-[var(--color-navy)] text-white rounded-full font-semibold hover:bg-black"
            >
              Sign In to Watch
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-[var(--color-stone-light)]">
          You can still hear Pastor Ted preach live every Sunday at 11:00 AM in person.
        </div>
      </div>
    );
  }

  // Approved member view - show actual sermons
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">VERSE BY VERSE PREACHING</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Sermons</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)] max-w-2xl mx-auto">
          Welcome, member. Here are Pastor Ted’s messages for the church family.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--color-stone-light)]">Loading sermons...</div>
      ) : sermons.length > 0 ? (
        <div className="space-y-8">
          {sermons.map((sermon) => {
            // Extract YouTube video ID from various URL formats
            const getVideoId = (url: string) => {
              const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
              return match ? match[1] : null;
            };

            const videoId = getVideoId(sermon.video_url);
            const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

            return (
              <div key={sermon.id} className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden">
                <div className="p-6 md:p-8 border-b">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <h3 className="text-2xl font-semibold text-[var(--color-navy)]">{sermon.title}</h3>
                      <p className="text-sm text-[var(--color-stone-light)] mt-1">
                        {sermon.preacher} • {new Date(sermon.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {sermon.description && (
                    <p className="mt-4 text-[var(--color-stone)]">{sermon.description}</p>
                  )}
                </div>

                {embedUrl ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={embedUrl}
                      title={sermon.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-[var(--color-stone-light)]">
                    Video link not available yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10 text-center">
          <p className="text-[var(--color-stone)]">No sermons have been added yet. Check back soon.</p>
        </div>
      )}

      <div className="mt-12 text-center text-sm text-[var(--color-stone-light)]">
        These videos are for the church family only. Please do not share the links outside our membership.
      </div>
    </div>
  );
}
