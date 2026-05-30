"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface YouthPhoto {
  id: string;
  url: string;
  caption: string | null;
}

export default function YouthMinistry() {
  const [photos, setPhotos] = useState<YouthPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data, error } = await supabase
        .from('youth_photos')
        .select('id, url, caption')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching youth photos:', error);
      } else if (data) {
        setPhotos(data);
      }
      setLoading(false);
    };

    fetchPhotos();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">GRADES 6–12</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Youth Ministry</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)] max-w-2xl mx-auto">
          Real faith for real life in the high country.
        </p>
      </div>

      {/* Photo Gallery - Admin managed */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-[var(--color-navy)] mb-6 text-center">Youth Photos</h2>
        
        {loading ? (
          <div className="text-center py-12 text-[var(--color-stone-light)]">Loading photos...</div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-2xl aspect-square bg-[var(--color-cream)]">
                <img 
                  src={photo.url} 
                  alt={photo.caption || 'Youth photo'} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-4">
                    <p className="text-white text-sm">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--color-stone-light)]">
            Photos will appear here once added by the youth leaders.
          </div>
        )}
      </div>

      <div className="mt-12 text-center text-sm text-[var(--color-stone-light)]">
        Led by Heath &amp; Tessa Holmes. Parents are always welcome at youth events.
      </div>
    </div>
  );
}
