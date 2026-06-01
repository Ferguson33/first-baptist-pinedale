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
  // Temporary placeholder event so we can establish the display first.
  // This will be replaced later with real data from the admin.
  const placeholderEvents: SpotlightEvent[] = [
    {
      id: 'placeholder-1',
      title: 'Special Christmas Eve Service',
      date: '2025-12-24',
      time: '6:00 PM',
      description: 'Join us for a beautiful candlelight service celebrating the birth of Christ. All are welcome.',
      location: 'Sanctuary',
      image_url: null,
    },
  ];

  return (
    <EventsClient spotlightEvents={placeholderEvents} />
  );
}