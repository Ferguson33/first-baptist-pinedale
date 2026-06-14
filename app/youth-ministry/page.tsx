"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface YouthAlbum {
  id: string;
  title: string;
  date: string | null;
}

interface YouthPhoto {
  id: string;
  url: string;
  caption: string | null;
  album_id: string | null;
}

interface YouthEvent {
  id: string;
  title: string;
  date: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
}

export default function YouthMinistry() {
  const supabase = createClient();

  // Content (from sermon_settings)
  const [youthContent, setYouthContent] = useState({
    youth_pastor_note: "",
    youth_sunday_school_lesson: "",
    youth_sunday_school_reference: "",
    youth_sunday_school_date: "",
    youth_google_doc_url: "",
  });

  // Events
  const [youthEvents, setYouthEvents] = useState<YouthEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Albums + Photos
  const [albums, setAlbums] = useState<YouthAlbum[]>([]);
  const [photos, setPhotos] = useState<YouthPhoto[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [albumsError, setAlbumsError] = useState<string | null>(null);

  // Selection / gallery
  const [selectedAlbum, setSelectedAlbum] = useState<YouthAlbum | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<YouthPhoto[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Overall page loading (for initial)
  const [initialLoading, setInitialLoading] = useState(true);

  // Safe date formatters (avoid timezone day-shift)
  function formatLocalDate(dateString: string | null | undefined) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return '';
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  function formatAlbumDate(dateString: string | null | undefined) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return '';
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  // Robust fetchers with error + loading handling
  const fetchYouthContent = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sermon_settings')
        .select('youth_pastor_note, youth_sunday_school_lesson, youth_sunday_school_reference, youth_sunday_school_date, youth_google_doc_url')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching youth content:', error);
      }

      // Always set (defensive - previously working data should appear even if query is partial)
      const d = data || {};
      setYouthContent({
        youth_pastor_note: d.youth_pastor_note || "",
        youth_sunday_school_lesson: d.youth_sunday_school_lesson || "",
        youth_sunday_school_reference: d.youth_sunday_school_reference || "",
        youth_sunday_school_date: d.youth_sunday_school_date || "",
        youth_google_doc_url: d.youth_google_doc_url || "",
      });
    } catch (err: any) {
      console.error('Error fetching youth content:', err);
      // Keep previous/empty values - sections will simply not render if empty
    }
  }, [supabase]);

  const fetchYouthEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const { data, error } = await supabase
        .from('youth_events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setYouthEvents(data || []);
    } catch (err: any) {
      console.error('Error fetching youth events:', err);
      setEventsError("Could not load upcoming events right now.");
    } finally {
      setEventsLoading(false);
    }
  }, [supabase]);

  const fetchAlbumsAndPhotos = useCallback(async () => {
    setAlbumsLoading(true);
    setAlbumsError(null);
    try {
      const [albumsRes, photosRes] = await Promise.all([
        supabase.from('youth_albums').select('id, title, date').order('date', { ascending: false }),
        supabase.from('youth_photos').select('id, url, caption, album_id').order('uploaded_at', { ascending: false })
      ]);

      if (albumsRes.error) throw albumsRes.error;
      if (photosRes.error) throw photosRes.error;

      setAlbums(albumsRes.data || []);
      setPhotos(photosRes.data || []);
    } catch (err: any) {
      console.error('Error fetching youth albums/photos:', err);
      setAlbumsError("Could not load photo albums right now. Try refreshing.");
    } finally {
      setAlbumsLoading(false);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setInitialLoading(true);
      await Promise.all([
        fetchYouthContent(),
        fetchYouthEvents(),
        fetchAlbumsAndPhotos()
      ]);
      setInitialLoading(false);
    };
    loadAll();
  }, [fetchYouthContent, fetchYouthEvents, fetchAlbumsAndPhotos]);

  // Gallery keyboard nav + scroll lock (robust deps)
  useEffect(() => {
    if (galleryOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const currentPhotos = selectedAlbum ? albumPhotos : photos;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!galleryOpen) return;

      if (e.key === 'Escape') {
        if (selectedAlbum) {
          closeAlbum();
        } else {
          setGalleryOpen(false);
        }
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? Math.max(0, currentPhotos.length - 1) : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === currentPhotos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryOpen, selectedAlbum, albumPhotos.length, photos.length]);

  const openGallery = (index: number) => {
    setCurrentIndex(index);
    setGalleryOpen(true);
  };

  const openAlbum = (album: YouthAlbum) => {
    const photosInAlbum = photos.filter(p => p.album_id === album.id);
    if (photosInAlbum.length === 0) {
      // Friendly instead of alert
      setAlbumsError(`"${album.title}" has no photos yet. Check back soon!`);
      setTimeout(() => setAlbumsError(null), 2800);
      return;
    }
    setSelectedAlbum(album);
    setAlbumPhotos(photosInAlbum);
    setCurrentIndex(0);
    setGalleryOpen(true);
  };

  const closeAlbum = () => {
    setSelectedAlbum(null);
    setAlbumPhotos([]);
    setGalleryOpen(false);
  };

  // Smooth full refresh (used by buttons)
  const refreshAll = async () => {
    await Promise.all([
      fetchYouthContent(),
      fetchYouthEvents(),
      fetchAlbumsAndPhotos()
    ]);
  };

  const refreshEvents = async () => {
    await fetchYouthEvents();
  };

  const refreshAlbums = async () => {
    await fetchAlbumsAndPhotos();
  };

  // Initial skeleton while first load
  if (initialLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">GRADES 6–12</div>
          <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Youth Ministry</h1>
        </div>
        <div className="text-center py-12 text-[var(--color-stone-light)]">Loading youth ministry…</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">GRADES 6–12</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Youth Ministry</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)] max-w-2xl mx-auto">
          Real faith for real life in the high country.
        </p>
      </div>

      {/* Youth Pastor Note */}
      {youthContent.youth_pastor_note && (
        <div className="mb-12">
          <div className="text-center mb-5">
            <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)]">FROM OUR YOUTH PASTOR</div>
            <h2 className="text-3xl font-semibold tracking-tight mt-2 text-[var(--color-navy)]">Note from the Youth Pastor</h2>
          </div>
          <div className="max-w-3xl mx-auto bg-[var(--color-cream)] border-l-4 border-[var(--color-gold)] pl-8 pr-6 py-7 rounded-r-3xl">
            <p className="text-[17px] leading-relaxed text-[var(--color-stone)] italic">
              “{youthContent.youth_pastor_note}”
            </p>
          </div>
        </div>
      )}

      {/* This Week in Youth Sunday School */}
      {(youthContent.youth_sunday_school_lesson || youthContent.youth_sunday_school_date) && (
        <div className="max-w-2xl mx-auto mb-14">
          <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 text-center">
            <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)] mb-1">THIS WEEK IN YOUTH</div>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-navy)]">Youth Sunday School</h3>

            {youthContent.youth_sunday_school_date && (
              <div className="text-[var(--color-gold-dark)] mt-3 text-sm font-medium">
                {formatLocalDate(youthContent.youth_sunday_school_date)}
              </div>
            )}

            {youthContent.youth_sunday_school_lesson && (
              <div className="mt-4 text-xl font-medium text-[var(--color-navy)]">
                {youthContent.youth_sunday_school_lesson}
              </div>
            )}

            {youthContent.youth_sunday_school_reference && (
              <div className="mt-1 text-[var(--color-stone)]">
                {youthContent.youth_sunday_school_reference}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Optional Google Doc Embed */}
      {youthContent.youth_google_doc_url && (
        <div className="mb-14">
          <div className="mb-5">
            <div className="font-semibold text-2xl tracking-tight">Youth Resources</div>
            <p className="text-sm text-[var(--color-stone-light)]">Additional information and documents for our youth and families.</p>
          </div>
          <div className="bg-white border border-[var(--color-gold)]/10 rounded-2xl overflow-hidden shadow-sm">
            <iframe
              src={youthContent.youth_google_doc_url}
              width="100%"
              height="900"
              frameBorder="0"
              title="Youth Resources"
              className="w-full block"
              style={{ minHeight: '600px', border: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Upcoming Youth Events — with background images / pictures */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-semibold text-2xl tracking-tight">Upcoming Youth Events</div>
            <p className="text-sm text-[var(--color-stone-light)]">Special events and activities for our youth and families.</p>
          </div>
          <button
            onClick={refreshEvents}
            disabled={eventsLoading}
            className="text-xs px-3 py-1 border border-[var(--color-gold)]/40 rounded hover:bg-[var(--color-cream)] transition disabled:opacity-50"
          >
            {eventsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {eventsError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{eventsError}</span>
            <button onClick={refreshEvents} className="underline">Retry</button>
          </div>
        )}

        {eventsLoading ? (
          <div className="text-center py-10 text-[var(--color-stone-light)] border border-[var(--color-gold)]/10 rounded-3xl">Loading events…</div>
        ) : youthEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {youthEvents.map((event) => (
              <div 
                key={event.id} 
                className="group relative bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition"
              >
                {/* Event picture / background */}
                {event.image_url ? (
                  <div 
                    className="aspect-video bg-[var(--color-cream)] bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${event.image_url})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <div className="font-semibold text-2xl tracking-tight drop-shadow">{event.title}</div>
                      {event.date && (
                        <div className="text-sm text-white/90 mt-1 drop-shadow">{formatLocalDate(event.date)}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="font-semibold text-xl tracking-tight text-[var(--color-navy)]">{event.title}</div>
                    {event.date && (
                      <div className="text-sm text-[var(--color-gold-dark)] mt-1">{formatLocalDate(event.date)}</div>
                    )}
                  </div>
                )}

                {/* Body (only if image used, otherwise already in header area) */}
                {event.image_url && (
                  <div className="p-6">
                    {event.description && (
                      <p className="text-[var(--color-stone)] text-sm">{event.description}</p>
                    )}
                    {event.link_url && (
                      <a 
                        href={event.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center text-sm font-medium text-[var(--color-gold-dark)] hover:underline"
                      >
                        Learn more or register →
                      </a>
                    )}
                  </div>
                )}

                {!event.image_url && event.description && (
                  <div className="px-6 pb-6">
                    <p className="text-[var(--color-stone)] text-sm">{event.description}</p>
                    {event.link_url && (
                      <a 
                        href={event.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center text-sm font-medium text-[var(--color-gold-dark)] hover:underline"
                      >
                        Learn more or register →
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--color-stone-light)] border border-[var(--color-gold)]/20 rounded-3xl">
            No upcoming youth events posted yet. Check back soon or contact a youth leader.
          </div>
        )}
      </div>

      {/* Youth Photo Albums — fully public, reload fixed */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-semibold text-2xl tracking-tight">Youth Photo Albums</div>
            <p className="text-sm text-[var(--color-stone-light)]">Memories from camps, service projects, and gatherings.</p>
          </div>
          <button 
            onClick={refreshAlbums}
            disabled={albumsLoading}
            className="text-xs px-3 py-1 border border-[var(--color-gold)]/40 rounded hover:bg-[var(--color-cream)] transition disabled:opacity-50"
          >
            {albumsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {albumsError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{albumsError}</span>
            <button onClick={refreshAlbums} className="underline">Retry</button>
          </div>
        )}

        {albumsLoading ? (
          <div className="text-center py-12 text-[var(--color-stone-light)]">Loading albums…</div>
        ) : albums.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => {
              const photosInAlbum = photos.filter(p => p.album_id === album.id);
              const coverPhoto = photosInAlbum[0];

              return (
                <div 
                  key={album.id}
                  onClick={() => openAlbum(album)}
                  className="group border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden bg-white hover:shadow-md transition cursor-pointer"
                >
                  <div className="aspect-video bg-[var(--color-cream)] relative">
                    {coverPhoto ? (
                      <img 
                        src={coverPhoto.url} 
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-stone-light)]">
                        No photos yet
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="font-semibold text-xl tracking-tight">{album.title}</div>
                    {album.date && (
                      <div className="text-sm text-[var(--color-gold-dark)] mt-1">
                        {formatAlbumDate(album.date)}
                      </div>
                    )}
                    <div className="text-xs text-[var(--color-stone-light)] mt-2">
                      {photosInAlbum.length} photo{photosInAlbum.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--color-stone-light)] border border-[var(--color-gold)]/20 rounded-3xl">
            Photo albums will appear here once added by the youth leaders.
          </div>
        )}
      </div>

      <div className="mt-12 text-center text-sm text-[var(--color-stone-light)]">
        Led by Heath &amp; Tessa Holmes. Parents are always welcome at youth events.
      </div>

      {/* Photo Gallery Lightbox — album-aware + keyboard */}
      {galleryOpen && (selectedAlbum ? albumPhotos.length > 0 : photos.length > 0) && (
        <div 
          className="fixed inset-0 bg-black/95 z-[70] flex flex-col"
          onClick={() => {
            if (selectedAlbum) {
              closeAlbum();
            } else {
              setGalleryOpen(false);
            }
          }}
        >
          {/* Top bar */}
          <div className="flex-shrink-0 h-14 flex items-center justify-between px-4 bg-black/70 z-[80]">
            <div className="text-white text-sm">
              {selectedAlbum ? selectedAlbum.title + " — " : ""}{currentIndex + 1} / {(selectedAlbum ? albumPhotos : photos).length}
            </div>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                if (selectedAlbum) closeAlbum(); else setGalleryOpen(false); 
              }}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white text-[var(--color-navy)] text-3xl font-bold hover:bg-[var(--color-gold)] hover:text-white shadow-lg transition"
              aria-label="Close gallery"
            >
              ×
            </button>
          </div>

          {/* Main image */}
          <div 
            className="flex-1 flex items-center justify-center p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            { (selectedAlbum ? albumPhotos : photos).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const len = (selectedAlbum ? albumPhotos : photos).length;
                  setCurrentIndex((prev) => (prev === 0 ? len - 1 : prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-4xl hover:text-[var(--color-gold)] transition z-10"
              >
                ‹
              </button>
            )}

            <div className="flex flex-col items-center max-w-[95vw] max-h-[calc(100vh-120px)]">
              <img 
                src={(selectedAlbum ? albumPhotos : photos)[currentIndex]?.url} 
                alt={(selectedAlbum ? albumPhotos : photos)[currentIndex]?.caption || "Youth photo"} 
                className="max-w-full max-h-[70vh] object-contain bg-[var(--color-cream)] shadow-2xl" 
              />
              {(selectedAlbum ? albumPhotos : photos)[currentIndex]?.caption && (
                <div className="mt-4 px-6 py-2 bg-black/70 rounded text-center text-white text-base md:text-lg max-w-2xl">
                  {(selectedAlbum ? albumPhotos : photos)[currentIndex]?.caption}
                </div>
              )}
            </div>

            { (selectedAlbum ? albumPhotos : photos).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const len = (selectedAlbum ? albumPhotos : photos).length;
                  setCurrentIndex((prev) => (prev === len - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-4xl hover:text-[var(--color-gold)] transition z-10"
              >
                ›
              </button>
            )}
          </div>

          { (selectedAlbum ? albumPhotos : photos).length > 1 && (
            <div className="flex-shrink-0 pb-4 text-center text-white/60 text-xs">
              Use ← → arrow keys or click the arrows to navigate
            </div>
          )}
        </div>
      )}
    </div>
  );
}
