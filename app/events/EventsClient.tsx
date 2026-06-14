"use client";

import React, { useState } from 'react';

interface SpotlightEvent {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
}

interface EventsClientProps {
  spotlightEvents: SpotlightEvent[];
}

export default function EventsClient({ spotlightEvents }: EventsClientProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Only show spotlight if there are events
  const hasSpotlight = spotlightEvents.length > 0;

  const openGallery = (index: number) => {
    setCurrentIndex(index);
    setGalleryOpen(true);
  };

  const closeGallery = () => {
    setGalleryOpen(false);
  };

  // Keyboard navigation for lightbox
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!galleryOpen) return;

      if (e.key === 'Escape') {
        closeGallery();
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? spotlightEvents.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === spotlightEvents.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryOpen, spotlightEvents.length]);

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
      {hasSpotlight && (
        <div className="mb-12">
          <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)] mb-3">Special Notice</div>
          <div className="space-y-4">
            {spotlightEvents.map((event, index) => (
              <div 
                key={event.id} 
                onClick={() => openGallery(index)}
                className="bg-[var(--color-navy)] text-white rounded-3xl p-6 md:p-8 shadow-lg border border-[var(--color-gold)]/30 cursor-pointer hover:shadow-xl transition"
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

      {/* Youth link (always visible, even when no spotlight events) */}
      <div className="mb-12 -mt-6 text-sm text-[var(--color-stone)]">
        Youth events and photo albums: <a href="/youth-ministry" className="text-[var(--color-gold-dark)] hover:underline font-medium">Youth Ministry page</a>.
      </div>

      {/* Weekly Schedule */}
      <div className="mb-16">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)] mb-6">Our Weekly Schedule</h2>

        <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 md:p-10">
          <div className="space-y-6 text-lg">
            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Potluck Breakfast</div>
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

      {/* Photo Gallery Lightbox for Spotlight Events */}
      {galleryOpen && spotlightEvents.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/95 z-[70] flex flex-col"
          onClick={closeGallery}
        >
          <div className="flex-shrink-0 h-14 flex items-center justify-between px-4 bg-black/70 z-[80]">
            <div className="text-white text-sm">
              {currentIndex + 1} / {spotlightEvents.length}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); closeGallery(); }}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white text-[var(--color-navy)] text-3xl font-bold hover:bg-[var(--color-gold)] hover:text-white shadow-lg transition"
            >
              ×
            </button>
          </div>

          <div 
            className="flex-1 flex items-center justify-center p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {spotlightEvents.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev === 0 ? spotlightEvents.length - 1 : prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-4xl hover:text-[var(--color-gold)] transition z-10"
              >
                ‹
              </button>
            )}

            <div className="flex flex-col items-center max-w-[95vw] max-h-[calc(100vh-120px)]">
              <img 
                src={spotlightEvents[currentIndex]?.image_url || '/placeholder-event.jpg'} 
                alt={spotlightEvents[currentIndex]?.title} 
                className="max-w-full max-h-[70vh] object-contain bg-[var(--color-cream)] shadow-2xl" 
              />
              <div className="mt-4 text-center text-white">
                <div className="text-xl font-semibold">{spotlightEvents[currentIndex]?.title}</div>
                <div className="text-[var(--color-gold-light)]">
                  {new Date(spotlightEvents[currentIndex].date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {spotlightEvents[currentIndex].time && ` • ${spotlightEvents[currentIndex].time}`}
                </div>
              </div>
            </div>

            {spotlightEvents.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev === spotlightEvents.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-4xl hover:text-[var(--color-gold)] transition z-10"
              >
                ›
              </button>
            )}
          </div>

          {spotlightEvents.length > 1 && (
            <div className="flex-shrink-0 pb-4 text-center text-white/60 text-xs">
              Use ← → arrow keys or click the arrows to navigate
            </div>
          )}
        </div>
      )}
    </div>
  );
}