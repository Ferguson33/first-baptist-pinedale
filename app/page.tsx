"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight, Clock, MapPin, Users, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [physicalProgress, setPhysicalProgress] = useState(68);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('building_progress')
        .select('physical_percent, funds_raised, funds_goal, physical_note')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching home progress:', error);
      } else if (data?.physical_percent !== undefined) {
        setPhysicalProgress(data.physical_percent);
      }
    };
    fetchProgress();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <div className="relative h-[92vh] min-h-[620px] flex items-center justify-center bg-[var(--color-navy-dark)]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&q=80')] bg-cover bg-center opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-navy-dark)]/30 via-[var(--color-navy-dark)]/20 to-[var(--color-navy-dark)]/40" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
          <div className="inline-block mb-6 px-6 py-2 rounded-full bg-black/40 backdrop-blur text-sm md:text-base tracking-[3px] text-white">
            PINEDALE, WY
          </div>

          <h1 className="text-7xl md:text-8xl font-semibold tracking-tighter leading-none mb-4 drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]">
            Welcome Home
          </h1>

          <p className="text-4xl md:text-5xl text-white font-light tracking-tight mb-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            First Baptist Church
          </p>

          <p className="text-[var(--color-gold-light)] text-lg md:text-xl tracking-[2px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            “The Bible as it is, for men as they are.”
          </p>

          <p className="mt-6 max-w-lg mx-auto text-xl md:text-2xl text-white/95 leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]">
            A warm, Bible-centered family of faith in the shadow of Fremont Peak, in the Wind River Mountains.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/visit"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-[var(--color-navy)] font-semibold hover:bg-[var(--color-gold)] hover:text-white transition text-lg shadow-lg"
            >
              Visitors Info <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-xs tracking-[3px]">SCROLL TO BEGIN</div>
      </div>

      {/* SERVICE TIMES BAR - prominent and welcoming */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-6 text-center text-sm">
          <div className="flex items-center justify-center gap-3">
            <Clock className="text-[var(--color-gold-dark)] w-5 h-5" />
            <div>
              <div className="font-semibold text-[var(--color-navy)]">Sunday Worship</div>
              <div className="text-[var(--color-stone-light)]">11:00 AM</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Users className="text-[var(--color-gold-dark)] w-5 h-5" />
            <div>
              <div className="font-semibold text-[var(--color-navy)]">Sunday School</div>
              <div className="text-[var(--color-stone-light)]">10:15 AM — All Ages</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Clock className="text-[var(--color-gold-dark)] w-5 h-5" />
            <div>
              <div className="font-semibold text-[var(--color-navy)]">Sunday Breakfast</div>
              <div className="text-[var(--color-stone-light)]">9:45 AM — Fellowship</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <MapPin className="text-[var(--color-gold-dark)] w-5 h-5" />
            <div>
              <div className="font-semibold text-[var(--color-navy)]">646 N Tyler Ave</div>
              <Link href="/visit" className="text-[var(--color-gold-dark)] hover:underline">Pinedale, WY 82941 →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* LATEST SERMON TEASER */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1">
            <div className="uppercase tracking-[2px] text-xs text-[var(--color-gold-dark)] mb-3">THIS SUNDAY'S MESSAGE</div>
            <h2 className="text-5xl leading-none tracking-tighter text-[var(--color-navy)]">The Faith That Moves Mountains</h2>
            <p className="mt-4 text-xl text-[var(--color-stone)]">Pastor Ted York • February 23, 2025</p>
            
            <div className="mt-8 flex gap-4">
              <Link href="/sermons" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[var(--color-navy)] text-white rounded-full font-semibold hover:bg-black">
                Watch Full Sermon <Play className="w-4 h-4" />
              </Link>
              <Link href="/sermons" className="inline-flex items-center gap-2 px-7 py-3.5 border border-[var(--color-navy)]/30 rounded-full font-medium hover:bg-[var(--color-cream)]">
                Browse Archive
              </Link>
            </div>
          </div>

          <div className="flex-1 relative aspect-video bg-[var(--color-navy)] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            <div className="text-center px-6">
              <div className="text-white/80 text-sm tracking-[2px] mb-3">LATEST SERMON</div>
              <h3 className="text-white text-3xl font-semibold tracking-tight mb-2">Coming Soon</h3>
              <p className="text-white/70 max-w-xs mx-auto">We are working on adding sermon recordings. Check back soon!</p>
              <Link href="/sermons" className="inline-block mt-5 text-sm text-[var(--color-gold-light)] hover:underline">Go to Sermons page →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* BUILDING PROJECT HIGHLIGHT */}
      <div className="bg-[var(--color-cream)] py-16 border-y">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-xs uppercase tracking-[3px] text-[var(--color-gold-dark)]">OUR JOURNEY OF FAITH</div>
          <h3 className="mt-3 text-4xl font-semibold text-[var(--color-navy)] tracking-tight">Multiplying Our Ministry</h3>
          <p className="mt-4 text-xl text-[var(--color-stone)] max-w-prose mx-auto">We are expanding our sanctuary and classrooms to better serve families in Pinedale and the surrounding ranches.</p>
          
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <div>Physical Progress</div>
              <div className="text-[var(--color-gold-dark)]">{physicalProgress}%</div>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-dark)] rounded-full transition-all" 
                style={{ width: `${physicalProgress}%` }} 
              />
            </div>
          </div>

          <Link href="/building-project" className="mt-8 inline-flex items-center gap-2 text-[var(--color-navy)] font-semibold hover:text-[var(--color-gold-dark)]">
            See full progress and photos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* QUICK INVITATION CARDS */}
      <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-6">
        {[
          { title: "Join Us Sunday", desc: "Everyone is welcome. Come as you are. Coffee & fellowship.", href: "/visit", icon: Users },
          { title: "Prayer Wall", desc: "Share your requests with our church family. We truly believe in the power of prayer.", href: "/prayer-wall", icon: Heart },
          { title: "Youth Ministry", desc: "Real faith for real life. For students grades 6–12.", href: "/youth", icon: Users },
        ].map((card, idx) => (
          <Link key={idx} href={card.href} className="group block border border-[var(--color-gold)]/30 hover:border-[var(--color-gold)] bg-white p-8 rounded-2xl transition">
            <card.icon className="w-8 h-8 text-[var(--color-gold-dark)] mb-6 group-hover:scale-110 transition" />
            <div className="font-semibold text-2xl text-[var(--color-navy)] tracking-tight">{card.title}</div>
            <p className="mt-3 text-[var(--color-stone)] pr-4">{card.desc}</p>
            <div className="mt-6 text-sm font-semibold text-[var(--color-gold-dark)] group-hover:underline">Learn more →</div>
          </Link>
        ))}
      </div>

      {/* PASTORS WELCOME */}
      <div className="bg-[var(--color-navy)] text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-[var(--color-gold)] tracking-[3px] text-xs mb-3">FROM OUR PASTORS</div>
          <p className="text-2xl md:text-3xl font-light leading-snug tracking-tight">
            “We are so grateful you’re here. Whether you’ve been walking with the Lord for decades or you’re just asking questions, there is a place for you at First Baptist Church of Pinedale.”
          </p>
          <div className="mt-8 text-[var(--color-gold-light)]">— Pastors Ted & Teresa York</div>
          <div className="text-sm text-white/80">First Baptist Church of Pinedale</div>
          <div className="mt-2 text-xs text-white/60 tracking-wide">“The Bible as it is, for men as they are.”</div>
        </div>
      </div>
    </div>
  );
}
