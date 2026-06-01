"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SpotlightEvent {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  description?: string | null;
  location?: string | null;
}

export default function EventsPage() {
  const [spotlightEvents, setSpotlightEvents] = useState<SpotlightEvent[]>([]);

  useEffect(() => {
    const fetchSpotlightEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (data) {
        setSpotlightEvents(data);
      }
    };

    fetchSpotlightEvents();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">JOIN US</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Events &amp; Schedule</h1>
        <p className="mt-4 text-lg text-[var(--color-stone)] max-w-2xl mx-auto">
          We are a small church in a high mountain town. Come as you are — we’d love to have you with us.
        </p>
      </div>

      {/* Spotlight / Special Events - Only shows when admin adds something */}
      {spotlightEvents.length > 0 && (
        <div className="mb-12">
          <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)] mb-3">Special Notice</div>
          <div className="space-y-4">
            {spotlightEvents.map((event) => (
              <div 
                key={event.id} 
                className="bg-[var(--color-navy)] text-white rounded-3xl p-6 md:p-8 shadow-lg border border-[var(--color-gold)]/30"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight">{event.title}</div>
                    <div className="mt-2 text-[var(--color-gold-light)] text-lg">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {event.time && ` • ${event.time}`}
                    </div>
                    {event.location && (
                      <div className="mt-1 text-sm text-white/80">{event.location}</div>
                    )}
                  </div>
                  {event.description && (
                    <div className="md:max-w-md text-white/90 text-[15px] leading-relaxed">
                      {event.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="mb-16">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)] mb-6">Our Weekly Schedule</h2>

        <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 md:p-10">
          <div className="space-y-6 text-lg">
            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Sunday Breakfast Fellowship</div>
              <div className="text-[var(--color-stone)]">9:45 AM — Potluck-style breakfast. Come and enjoy good food and fellowship.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Sunday School</div>
              <div className="text-[var(--color-stone)]">10:15 AM</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Teen Sunday School</div>
              <div className="text-[var(--color-stone)]">10:15 AM — 6th grade through 12th grade</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Morning Worship</div>
              <div className="text-[var(--color-stone)]">11:00 AM — Pastor Ted York preaches verse by verse through the Bible.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Junior Church</div>
              <div className="text-[var(--color-stone)]">During Sunday Morning Worship — Ages 4 through 5th grade</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start border-t pt-6 mt-2">
              <div className="font-semibold text-[var(--color-navy)]">Nursery</div>
              <div className="text-[var(--color-stone)]">
                Available during Sunday School and the morning service.
                {/* TODO: Replace this placeholder link with the actual Google Calendar share link for nursery scheduling */}
                <div className="mt-2">
                  <a
                    href="https://calendar.google.com/calendar/embed?src=jncferguson18%40gmail.com&ctz=America%2FDenver"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-[var(--color-navy)] hover:bg-black text-white text-sm rounded-full transition"
                  >
                    View Nursery Volunteer Schedule →
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t text-sm text-[var(--color-stone-light)]">
            We currently do not have a Sunday evening service. We are a small congregation and value the time together we do have on Sunday mornings.
          </div>
        </div>
      </div>

      {/* Google Calendar Placeholder */}
      <div className="mb-16">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)] mb-4">Events Calendar</h2>
        <p className="text-[var(--color-stone)] mb-6">
          Special events, fellowships, and activities will appear here once our church calendar is set up.
        </p>

        {/* Placeholder for Google Calendar Embed */}
        <div className="border-2 border-dashed border-[var(--color-gold)]/40 rounded-3xl p-10 md:p-16 bg-[var(--color-cream)] text-center min-h-[420px] flex flex-col items-center justify-center">
          <div className="max-w-md">
            <div className="font-semibold text-xl text-[var(--color-navy)] mb-3">
              Google Calendar Embed
            </div>
            <p className="text-[var(--color-stone)] mb-4">
              A public Google Calendar will be embedded here. Events can then be easily added and updated by the church.
            </p>
            <div className="text-xs text-[var(--color-stone-light)]">
              (Placeholder — ready for the embed code when the calendar is created)
            </div>
          </div>
        </div>
      </div>

      {/* Choir & Ministry Notes */}
      <div className="max-w-2xl">
        <h3 className="font-semibold text-xl text-[var(--color-navy)] mb-3">Current Ministry Notes</h3>
        <ul className="space-y-2 text-[var(--color-stone)]">
          <li>• Pastor Ted York preaches verse-by-verse through the Scriptures.</li>
          <li>• We are excited to be starting a choir.</li>
          <li>• Coffee is always available.</li>
        </ul>
      </div>


    </div>
  );
}
