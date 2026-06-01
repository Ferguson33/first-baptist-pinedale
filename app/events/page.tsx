import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore } from 'next/cache';
import EventsClient from './EventsClient';

interface SpotlightEvent {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
}

// Force the page to be dynamic (fresh fetch on every request).
// This ensures that events created in the admin appear on the public
// /events page immediately instead of being frozen at build time.
export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  // Ensure this is never cached — always fetch the latest events from the DB.
  unstable_noStore();

  // Public read using the anon key.
  // We have a proper "Public can view events" policy (TO public USING true),
  // so the anon key has SELECT access. This is the correct way for public data.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching spotlight events for static render:', error);
  }

  const spotlightEvents = data ?? [];

  // TEMPORARY DEBUG - remove after we confirm data flow
  console.log('[PUBLIC /events] Anon key fetch result:', {
    count: spotlightEvents.length,
    events: spotlightEvents.map(e => ({ id: e.id, title: e.title, date: e.date })),
    error: error?.message,
    timestamp: new Date().toISOString()
  });

  return (
    <>
      <EventsClient spotlightEvents={spotlightEvents as SpotlightEvent[]} />

      {/* TEMPORARY DEBUG PANEL - visible on the public page */}
      <div className="max-w-4xl mx-auto px-6 pb-20 text-xs text-stone-500 border-t pt-8 mt-8">
        <div className="font-mono">
          DEBUG: Fetched <strong>{spotlightEvents.length}</strong> event(s) from Supabase (anon key) at {new Date().toLocaleTimeString()}
        </div>
        {spotlightEvents.length > 0 && (
          <ul className="mt-2 space-y-1">
            {spotlightEvents.map(ev => (
              <li key={ev.id}>
                • {ev.title} — {ev.date} {ev.time ? `(${ev.time})` : ''}
              </li>
            ))}
          </ul>
        )}
        {error && <div className="text-red-600 mt-1">Error: {error.message}</div>}
        <div className="text-[10px] mt-2 text-stone-400">
          (This debug panel is temporary. Hard refresh to see latest fetch.)
        </div>
      </div>
    </>
  );
}