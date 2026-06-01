import React from 'react';
import { createClient } from '@supabase/supabase-js';
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
  // Server-side fetch using service role.
  // This completely bypasses RLS and any client-side auth issues.
  // Safe because this runs only on the server.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching spotlight events for static render:', error);
  }

  const spotlightEvents = data ?? [];

  return (
    <EventsClient spotlightEvents={spotlightEvents as SpotlightEvent[]} />
  );
}