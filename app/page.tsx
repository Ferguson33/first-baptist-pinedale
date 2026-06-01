"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight, Clock, MapPin, Users, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [physicalProgress, setPhysicalProgress] = useState(68);

  // ============================================
  // MEET THE PASTORS - YouTube Video IDs
  // Update these when the short intro videos are ready
  // ============================================
  const PASTOR_YORK_VIDEO_ID = "PASTOR_YORK_VIDEO_ID";      // Ted & Teresa York
  const PASTOR_HOLMES_VIDEO_ID = "PASTOR_HOLMES_VIDEO_ID";  // Heath & Tessa Holmes

  // Sermon teaser content from admin (including Youth Sunday School)
  const [sermonTeaser, setSermonTeaser] = useState({
    pastor_note: "",
    upcoming_title: "The Faith That Moves Mountains",
    upcoming_reference: "Mark 11:22-24",
    upcoming_date: "",
    sunday_school_lesson: "",
    sunday_school_reference: "",
    youth_sunday_school_lesson: "",
    youth_sunday_school_reference: "",
    youth_sunday_school_date: "",
    youth_pastor_note: "",
    youth_google_doc_url: "",
  });

  // Safely format YYYY-MM-DD strings from Supabase as local dates
  // (avoids JavaScript treating them as UTC and shifting by a day)
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

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('building_progress')
        .select('physical_percent')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching home progress:', error);
        // Keep whatever value we have (don't reset to 68 on transient failures)
      } else if (data?.physical_percent !== undefined) {
        setPhysicalProgress(data.physical_percent);
      }
    } catch (err) {
      console.error('Unexpected error fetching home progress:', err);
    }
  };

  useEffect(() => {
    fetchProgress();

    // Load sermon teaser settings (Pastor note + upcoming message)
    async function loadSermonTeaser() {
      const { data } = await supabase
        .from('sermon_settings')
        .select('pastor_note, upcoming_title, upcoming_reference, upcoming_date, sunday_school_lesson, sunday_school_reference, youth_sunday_school_lesson, youth_sunday_school_reference, youth_sunday_school_date, youth_pastor_note, youth_google_doc_url')
        .eq('id', 1)
        .single();

      if (data) {
        setSermonTeaser({
          pastor_note: data.pastor_note || "",
          upcoming_title: data.upcoming_title || "The Faith That Moves Mountains",
          upcoming_reference: data.upcoming_reference || "Mark 11:22-24",
          upcoming_date: data.upcoming_date || "",
          sunday_school_lesson: data.sunday_school_lesson || "",
          sunday_school_reference: data.sunday_school_reference || "",
          youth_sunday_school_lesson: data.youth_sunday_school_lesson || "",
          youth_sunday_school_reference: data.youth_sunday_school_reference || "",
          youth_sunday_school_date: data.youth_sunday_school_date || "",
          youth_pastor_note: data.youth_pastor_note || "",
          youth_google_doc_url: data.youth_google_doc_url || "",
        });
      }
    }
    loadSermonTeaser();

    // Mobile resilience + re-fetch sermon settings when returning to tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchProgress();
        loadSermonTeaser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleFocus = () => {
      fetchProgress();
      loadSermonTeaser();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <div className="relative h-[92vh] min-h-[620px] flex items-center justify-center bg-[var(--color-navy-dark)]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&q=80')] bg-cover bg-center brightness-[1.25] opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-navy-dark)]/15 via-[var(--color-navy-dark)]/10 to-[var(--color-navy-dark)]/25" />
        
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
              <div className="font-semibold text-[var(--color-navy)]">Sunday Breakfast</div>
              <div className="text-[var(--color-stone-light)]">9:45 AM — Fellowship</div>
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
              <div className="font-semibold text-[var(--color-navy)]">Sunday Morning Worship</div>
              <div className="text-[var(--color-stone-light)]">11:00 AM</div>
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

      {/* SERMON TEASER SECTION */}
      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* Prominent "Note from the Pastor" - placed above for continuity */}
        {sermonTeaser.pastor_note && (
          <div className="mb-12">
            <div className="text-center mb-5">
              <h2 className="text-4xl font-semibold tracking-tighter text-[var(--color-navy)]">Note from the Pastor</h2>
            </div>

            <div className="max-w-3xl mx-auto bg-[var(--color-cream)] border-l-4 border-[var(--color-gold)] pl-8 pr-6 py-7 rounded-r-3xl">
              <p className="text-[17px] leading-relaxed text-[var(--color-stone)] italic">
                “{sermonTeaser.pastor_note}”
              </p>
            </div>
          </div>
        )}

        {/* This Week at First Baptist - Main Service + Sunday School + Youth */}
        <div className="max-w-5xl mx-auto px-6 pb-8">
          <div className="bg-[var(--color-cream)] border border-[var(--color-gold)]/30 rounded-3xl p-8">
            <div className="text-center mb-6">
              <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)]">THIS WEEK AT FIRST BAPTIST</div>
              <h2 className="text-3xl font-semibold tracking-tight mt-2 text-[var(--color-navy)]">Sunday Worship &amp; Sunday School</h2>
            </div>

            {/* Main Service */}
            <div className="mb-6">
              <div className="uppercase tracking-[2px] text-xs text-[var(--color-gold-dark)] mb-1">MAIN SERVICE</div>
              {sermonTeaser.upcoming_date && (
                <div className="text-sm text-[var(--color-gold-dark)] mb-1">
                  {formatLocalDate(sermonTeaser.upcoming_date)}
                </div>
              )}
              <div className="text-2xl font-semibold text-[var(--color-navy)]">
                {sermonTeaser.upcoming_title || "This Sunday's Message"}
              </div>
              {sermonTeaser.upcoming_reference && (
                <div className="text-lg text-[var(--color-gold-dark)] mt-1">
                  {sermonTeaser.upcoming_reference}
                </div>
              )}
            </div>

            {/* Main Sunday School */}
            <div className="mb-6 border-t border-[var(--color-gold)]/20 pt-6">
              <div className="uppercase tracking-[2px] text-xs text-[var(--color-gold-dark)] mb-1">SUNDAY SCHOOL</div>
              <div className="text-xl font-semibold text-[var(--color-navy)]">
                {sermonTeaser.sunday_school_lesson || "This Week's Lesson"}
              </div>
              {sermonTeaser.sunday_school_reference && (
                <div className="text-base text-[var(--color-gold-dark)] mt-1">
                  {sermonTeaser.sunday_school_reference}
                </div>
              )}
            </div>

            {/* Youth Sunday School */}
            <div className="border-t border-[var(--color-gold)]/20 pt-6">
              <div className="uppercase tracking-[2px] text-xs text-[var(--color-gold-dark)] mb-1">YOUTH SUNDAY SCHOOL</div>
              {sermonTeaser.youth_sunday_school_date && (
                <div className="text-sm text-[var(--color-gold-dark)] mb-1">
                  {formatLocalDate(sermonTeaser.youth_sunday_school_date)}
                </div>
              )}
              <div className="text-xl font-semibold text-[var(--color-navy)]">
                {sermonTeaser.youth_sunday_school_lesson || "This Week's Youth Lesson"}
              </div>
              {sermonTeaser.youth_sunday_school_reference && (
                <div className="text-base text-[var(--color-gold-dark)] mt-1">
                  {sermonTeaser.youth_sunday_school_reference}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MEET THE PASTORS - Short intro videos */}
        <div className="max-w-6xl mx-auto mt-8">
          <div className="text-center mb-8">
            <div className="uppercase tracking-[3px] text-xs text-[var(--color-gold-dark)]">OUR PASTORAL TEAM</div>
            <h2 className="text-4xl font-semibold tracking-tighter mt-2 text-[var(--color-navy)]">Meet the Pastors</h2>
            <p className="mt-2 text-[var(--color-stone)] max-w-md mx-auto">
              Get to know the families who lead and serve at First Baptist Church of Pinedale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Pastor Ted & Teresa York */}
            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-black">
                {/* TODO: Replace with the final YouTube video ID for Pastor Ted & Teresa */}
                <iframe
                  src={`https://www.youtube.com/embed/${PASTOR_YORK_VIDEO_ID}`}
                  title="Meet Pastor Ted &amp; Teresa York"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-6">
                <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)]">Lead Pastor</div>
                <div className="font-semibold text-2xl tracking-tight text-[var(--color-navy)] mt-1">
                  Pastor Ted &amp; Teresa York
                </div>
              </div>
            </div>

            {/* Pastor Heath & Tessa Holmes */}
            <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-black">
                {/* TODO: Replace with the final YouTube video ID for Pastor Heath &amp; Tessa */}
                <iframe
                  src={`https://www.youtube.com/embed/${PASTOR_HOLMES_VIDEO_ID}`}
                  title="Meet Pastor Heath &amp; Tessa Holmes"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-6">
                <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)]">Assistant Pastor / Youth &amp; Music</div>
                <div className="font-semibold text-2xl tracking-tight text-[var(--color-navy)] mt-1">
                  Pastor Heath &amp; Tessa Holmes
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-[var(--color-stone-light)] mt-6">
            Short videos introducing our pastoral families — coming soon.
          </p>
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
          { title: "Prayer Bulletin", desc: "Current prayer focuses and updates for our church family.", href: "/prayer-bulletin", icon: Heart },
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
          <div className="text-[var(--color-gold)] tracking-[3px] text-xs mb-3">FROM OUR PASTOR</div>
          <p className="text-2xl md:text-3xl font-light leading-snug tracking-tight">
            “We are so grateful you’re here. Whether you’ve been walking with the Lord for decades or you’re just asking questions, there is a place for you at First Baptist Church of Pinedale.”
          </p>
          <div className="mt-8 text-[var(--color-gold-light)]">— Pastor Ted York</div>
          <div className="text-sm text-white/80">First Baptist Church of Pinedale</div>
          <div className="mt-2 text-xs text-white/60 tracking-wide">“The Bible as it is, for men as they are.”</div>
        </div>
      </div>
    </div>
  );
}
