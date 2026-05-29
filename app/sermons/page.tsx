"use client";

import React, { useState } from 'react';
import { Play, Search } from 'lucide-react';

interface Sermon {
  id: number;
  title: string;
  preacher: string;
  date: string;
  video: string;
  thumbnail: string;
  desc: string;
}

const initialSermons: Sermon[] = [
  { id: 1, title: "The Faith That Moves Mountains", preacher: "Ted York", date: "2025-02-23", video: "https://www.youtube.com/embed/dQw4w9wg", thumbnail: "https://picsum.photos/id/1016/700/390", desc: "Mark 11:22-24 — What does real mountain-moving faith look like in our daily ranch life?" },
  { id: 2, title: "The Good Shepherd in the High Country", preacher: "Heath Holmes", date: "2025-02-16", video: "https://www.youtube.com/embed/dQw4w9wg", thumbnail: "https://picsum.photos/id/1033/700/390", desc: "Psalm 23 — How Jesus cares for us exactly as a good shepherd cares for sheep on Wyoming ranges." },
  { id: 3, title: "When the Wind Blows Hard", preacher: "Ted York", date: "2025-02-09", video: "https://www.youtube.com/embed/dQw4w9wg", thumbnail: "https://picsum.photos/id/1018/700/390", desc: "James 1 — Finding joy in trials when the winter winds are fierce and the future feels uncertain." },
];

export default function SermonsPage() {
  const [sermons] = useState(initialSermons);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Sermon | null>(null);

  const filtered = sermons.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.preacher.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-9">
        <div>
          <div className="text-xs text-[var(--color-gold-dark)] tracking-widest">ARCHIVE SINCE 2011</div>
          <h1 className="text-5xl font-semibold tracking-tighter text-[var(--color-navy)]">Sermons</h1>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-4 top-4 text-[var(--color-stone-light)]" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search sermons or preachers..." 
            className="w-full border border-[var(--color-gold)]/30 pl-11 py-3 rounded-2xl text-sm focus:border-[var(--color-gold)]" 
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(s => (
          <div key={s.id} onClick={() => setSelected(s)} className="sermon-card group cursor-pointer border bg-white rounded-3xl overflow-hidden">
            <div className="relative">
              <img src={s.thumbnail} className="w-full aspect-video object-cover" alt="" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center"><Play className="w-5 h-5 text-[var(--color-navy)] ml-0.5" /></div>
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs text-[var(--color-gold-dark)]">{new Date(s.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
              <div className="font-semibold text-xl tracking-tight mt-1 leading-tight text-[var(--color-navy)]">{s.title}</div>
              <div className="mt-2 text-sm text-[var(--color-stone-light)]">{s.preacher}</div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="text-center py-20 text-[var(--color-stone-light)]">No sermons match that search.</div>}

      {/* Video Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="aspect-video bg-black">
              <iframe 
                width="100%" 
                height="100%" 
                src={selected.video} 
                title={selected.title}
                allowFullScreen 
              />
            </div>
            <div className="p-8">
              <div className="font-semibold text-3xl tracking-tight text-[var(--color-navy)]">{selected.title}</div>
              <div className="text-[var(--color-stone-light)] mt-1">{selected.preacher} • {new Date(selected.date).toLocaleDateString()}</div>
              <p className="mt-4 text-[var(--color-stone)]">{selected.desc}</p>
            </div>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-white bg-black/50 px-4 py-1 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
