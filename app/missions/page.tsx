"use client";

import React, { useState } from 'react';
import { missionaries, type Missionary } from '@/data/missionaries';

export default function MissionsPage() {
  const [selectedMissionary, setSelectedMissionary] = useState<Missionary | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-12">
        <div className="text-[var(--color-gold-dark)] text-xs tracking-[3px]">OUR HEART FOR THE WORLD</div>
        <h1 className="text-6xl tracking-tighter font-semibold mt-3 text-[var(--color-navy)]">Missions</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)]">
          We support 15 missionaries around the world at $150 per month each through Faith Promise giving.
        </p>
      </div>

      {/* Missionary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {missionaries.map((missionary, index) => (
          <div 
            key={index}
            className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden hover:border-[var(--color-gold)]/40 transition-all group cursor-pointer"
            onClick={() => setSelectedMissionary(missionary)}
          >
            {/* Photo / Placeholder Area */}
            <div className="aspect-[4/3] bg-[var(--color-cream)] flex items-center justify-center relative overflow-hidden">
              {missionary.photo ? (
                <img 
                  src={missionary.photo} 
                  alt={missionary.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[var(--color-navy)] text-white flex items-center justify-center text-2xl font-semibold tracking-tight">
                    {getInitials(missionary.name)}
                  </div>
                  <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-stone-light)] mt-3">Photo coming soon</div>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="font-semibold text-xl text-[var(--color-navy)] leading-tight group-hover:text-[var(--color-navy-dark)] transition">
                {missionary.name}
              </div>
              
              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <span className="text-[var(--color-stone-light)]">Field: </span>
                  <span className="text-[var(--color-stone)]">{missionary.field}</span>
                </div>
                <div>
                  <span className="text-[var(--color-stone-light)]">Country: </span>
                  <span className="inline-block px-3 py-0.5 text-xs rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] font-medium">
                    {missionary.country}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-stone-light)]">Organization: </span>
                  <span className="text-[var(--color-stone)]">{missionary.org}</span>
                </div>
              </div>

              <button 
                className="mt-5 text-sm px-4 py-2 rounded-full border border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)] hover:text-white hover:border-[var(--color-gold)] transition"
                onClick={(e) => { e.stopPropagation(); setSelectedMissionary(missionary); }}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-16 text-center text-sm text-[var(--color-stone-light)]">
        If you have questions about our current mission partners or would like to support them, please contact the church office.
      </div>

      {/* Modal */}
      {selectedMissionary && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMissionary(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-8 relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedMissionary(null)}
              className="absolute top-5 right-5 text-2xl leading-none text-[var(--color-stone-light)] hover:text-[var(--color-navy)]"
            >
              ×
            </button>

            <div className="text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-[var(--color-navy)] text-white flex items-center justify-center text-3xl font-semibold mb-5">
                {getInitials(selectedMissionary.name)}
              </div>
              
              <h3 className="text-3xl font-semibold text-[var(--color-navy)]">{selectedMissionary.name}</h3>
              
              <div className="mt-6 space-y-4 text-left">
                <div>
                  <div className="text-xs uppercase tracking-[1.5px] text-[var(--color-gold-dark)]">Field of Service</div>
                  <div className="text-lg text-[var(--color-stone)] mt-0.5">{selectedMissionary.field}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[1.5px] text-[var(--color-gold-dark)]">Country</div>
                  <div className="text-lg text-[var(--color-stone)] mt-0.5">{selectedMissionary.country}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[1.5px] text-[var(--color-gold-dark)]">Sending Organization</div>
                  <div className="text-lg text-[var(--color-stone)] mt-0.5">{selectedMissionary.org}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t text-center text-sm text-[var(--color-stone-light)]">
              These faithful servants are supported through our Faith Promise giving.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
