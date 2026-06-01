import React from 'react';
import { createClient } from '@/lib/supabase/server';
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

export default async function EventsPage() {
  // Server-side fetch — clean, no browser auth pollution.
  const supabase = await createClient();

  const { data: spotlightEvents = [] } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  return (
    <EventsClient spotlightEvents={spotlightEvents as SpotlightEvent[]} />
  );
}