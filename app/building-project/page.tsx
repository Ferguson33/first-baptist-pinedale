"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface BuildingProgress {
  physical_percent: number;
  funds_raised: number;
  funds_goal: number;
  physical_note?: string | null;
}

interface BuildingPhoto {
  id: string;
  url: string;
  caption: string | null;
}

export default function BuildingProject() {
  const supabase = createClient();
  const [progress, setProgress] = useState<BuildingProgress | null>(null);
  const [photos, setPhotos] = useState<BuildingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressError, setProgressError] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchBuildingData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setProgressError(false);
    }

    try {
      // Force fresh data (no cache) for progress - direct Supabase REST to always get live admin value
      const progressUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/building_progress?select=physical_percent,funds_raised,funds_goal,physical_note&id=eq.1`;
      const progressRes = await fetch(progressUrl, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (progressRes.ok) {
        const progressRows = await progressRes.json();
        const progressData = progressRows?.[0];
        if (progressData) {
          setProgress(progressData);
          setProgressError(false);
        } else {
          setProgressError(true);
        }
      } else {
        console.error('Progress fetch HTTP error:', progressRes.status);
        setProgressError(true);
      }

      // Photos can use client (or same fresh pattern if needed)
      const { data: photosData, error: photosError } = await supabase
        .from('building_photos')
        .select('id, url, caption')
        .order('uploaded_at', { ascending: false });

      if (photosError) {
        console.error('Error fetching building photos:', photosError);
      } else if (photosData) {
        setPhotos(photosData);
      }
    } catch (error) {
      console.error('Error fetching building data:', error);
      setProgressError(true);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildingData();
  }, []);

  // Gallery keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!galleryOpen) return;

      if (e.key === 'Escape') {
        setGalleryOpen(false);
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryOpen, photos.length]);

  // Note: Removed aggressive bfcache/visibility refetch listeners.
  // They were causing the progress numbers to bounce back to defaults on reload/focus.
  // Manual refresh button is still available.

  // Lock body scroll when gallery is open
  useEffect(() => {
    if (galleryOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [galleryOpen]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-3xl">
        <div className="uppercase text-xs text-[var(--color-gold-dark)] tracking-[3px]">MULTIPLYING OUR MINISTRY</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">The Building Project</h1>
        <p className="text-xl mt-4 text-[var(--color-stone)]">We are expanding our sanctuary, adding much-needed classroom space, and improving accessibility so that every generation in Pinedale and the surrounding ranches can gather comfortably to worship and grow in God’s Word.</p>
      </div>

      {/* Animated Progress Bars */}
      <div className="mt-12 grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-8 border">
          <div className="flex justify-between text-sm mb-2">
            <div className="font-semibold">Physical Progress</div>
            <div className="font-mono text-[var(--color-gold-dark)]">
              {loading && !progress ? 'Updating...' : `${progress?.physical_percent ?? '—'}%`}
              {progressError && <span className="text-[10px] text-[var(--color-stone-light)] ml-1">(last known)</span>}
            </div>
          </div>
          <div className="h-6 bg-[var(--color-cream)] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-dark)]" 
              initial={{ width: 0 }} 
              animate={{ width: progress ? `${progress.physical_percent}%` : (loading ? '5%' : '0%') }} 
              transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
          <div className="text-xs text-[var(--color-stone-light)] mt-2">
            {progress?.physical_note || "Steel, concrete, and framing are on schedule thanks to your faithful giving and many volunteer hours."}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border">
          <div className="flex justify-between text-sm mb-2">
            <div className="font-semibold">Funds Raised</div>
            <div>
              {loading && !progress ? (
                'Updating...'
              ) : progress ? (
                <><span className="font-mono text-[var(--color-gold-dark)]">${progress.funds_raised.toLocaleString()}</span> <span className="text-xs text-[var(--color-stone-light)]">of ${progress.funds_goal.toLocaleString()}</span></>
              ) : (
                '—'
              )}
              {progressError && <span className="text-[10px] text-[var(--color-stone-light)] ml-1">(last known)</span>}
            </div>
          </div>
          <div className="h-6 bg-[var(--color-cream)] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[var(--color-navy)]" 
              initial={{ width: 0 }} 
              animate={{ width: progress ? `${Math.min(100, (progress.funds_raised / progress.funds_goal) * 100)}%` : (loading ? '5%' : '0%') }} 
              transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
          <div className="text-xs text-[var(--color-stone-light)] mt-2">Every dollar given to the Building Fund goes straight into construction materials and labor.</div>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-2xl tracking-tight">Construction Photo Journal</div>
          <button 
            onClick={() => fetchBuildingData()}
            className="text-xs px-3 py-1 border border-[var(--color-gold)]/40 rounded hover:bg-[var(--color-cream)] transition"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading && photos.length === 0 ? (
            <div className="col-span-full text-center py-12 text-[var(--color-stone-light)]">Loading photos...</div>
          ) : photos.length > 0 ? (
            photos.map((p) => (
              <div 
                key={p.id} 
                className="group overflow-hidden rounded-2xl border aspect-[4/3] relative cursor-pointer bg-[var(--color-cream)]"
                onClick={() => {
                  const index = photos.findIndex(photo => photo.id === p.id);
                  setCurrentIndex(index >= 0 ? index : 0);
                  setGalleryOpen(true);
                }}
              >
                <img 
                  src={p.url} 
                  alt={p.caption || "Construction photo"} 
                  className="absolute inset-0 w-full h-full object-contain p-1 group-hover:scale-[1.02] transition-transform duration-500" 
                />
                {p.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-xs text-white bg-gradient-to-t from-black/80">
                    {p.caption}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-[var(--color-stone-light)]">
              Construction photos will appear here soon.
            </div>
          )}
        </div>
      </div>



      {/* Photo Gallery Lightbox with Navigation */}
      {galleryOpen && photos.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/95 z-[70] flex flex-col"
          onClick={() => setGalleryOpen(false)}
        >
          {/* Top bar with counter and close button */}
          <div className="flex-shrink-0 h-14 flex items-center justify-between px-4 bg-black/70 z-[80]">
            <div className="text-white text-sm">
              {currentIndex + 1} / {photos.length}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryOpen(false);
              }}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white text-[var(--color-navy)] text-3xl font-bold hover:bg-[var(--color-gold)] hover:text-white shadow-lg transition"
              aria-label="Close gallery"
            >
              ×
            </button>
          </div>

          {/* Main image area */}
          <div 
            className="flex-1 flex items-center justify-center p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous button */}
            {photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-4xl hover:text-[var(--color-gold)] transition z-10"
                aria-label="Previous photo"
              >
                ‹
              </button>
            )}

            <div className="flex flex-col items-center max-w-[95vw] max-h-[calc(100vh-120px)]">
              <img 
                src={photos[currentIndex].url} 
                alt={photos[currentIndex].caption || "Construction photo"} 
                className="max-w-full max-h-[70vh] object-contain bg-[var(--color-cream)] shadow-2xl" 
              />

              {photos[currentIndex].caption && (
                <div className="mt-4 px-6 py-2 bg-black/70 rounded text-center text-white text-base md:text-lg max-w-2xl">
                  {photos[currentIndex].caption}
                </div>
              )}
            </div>

            {/* Next button */}
            {photos.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-4xl hover:text-[var(--color-gold)] transition z-10"
                aria-label="Next photo"
              >
                ›
              </button>
            )}
          </div>

          {/* Bottom hint */}
          {photos.length > 1 && (
            <div className="flex-shrink-0 pb-4 text-center text-white/60 text-xs">
              Use ← → arrow keys or click the arrows to navigate
            </div>
          )}
        </div>
      )}
    </div>
  );
}
