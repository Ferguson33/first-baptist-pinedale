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

  // Fetch the events schedule Google Doc embed URL (configurable in Admin > Events)
  // Falls back to the previous hardcoded one if not set.
  const { data: settingsData } = await supabase
    .from('sermon_settings')
    .select('events_google_doc_url')
    .eq('id', 1)
    .single();

  const scheduleEmbedUrl = settingsData?.events_google_doc_url ||
    'https://docs.google.com/document/d/e/2PACX-1vQLQT7CzHu1iPGt87DhtA_c_7Tx_Nk7InA9l1A35-x9-jdlZNgpXesefwNwHwjtPA/pub?embedded=true';

  return (
    <EventsClient 
      spotlightEvents={spotlightEvents as SpotlightEvent[]} 
      scheduleEmbedUrl={scheduleEmbedUrl} 
    />
  );
}