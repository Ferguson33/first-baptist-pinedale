"use client";

import { Layout } from '@/components/Layout';
import { Users } from 'lucide-react';

export default function LeadershipPage() {
  const couples = [
    {
      names: "Pastor Ted & Teresa York",
      roles: "Lead Pastor & Women’s Ministry",
      bio: "Ted has served as lead pastor at First Baptist Pinedale for 14 years. A graduate of Bob Jones University and former rancher, Ted is a passionate Bible teacher who loves expository preaching. Teresa directs our women’s Bible studies, coordinates hospitality, and provides counsel to many women in the church and community. Together they have three grown children and seven grandchildren who all live nearby.",
      verse: "Preach the word; be instant in season, out of season; reprove, rebuke, exhort with all longsuffering and doctrine.",
      verseRef: "2 Timothy 4:2 (KJV)",
      image: "/images/pastors/york-couple.jpg"
    },
    {
      names: "Heath & Tessa Holmes",
      roles: "Assistant Pastor / Youth & Music Ministry",
      bio: "Heath and Tessa met in 2018 as students at Maranatha Baptist University. They were married on June 4, 2022. Tessa graduated with a Bachelor of Science in Nursing and is an RN. Heath graduated with a Bachelor of Arts in Biblical Counseling. The Lord led the Holmes to First Baptist Church of Pinedale in May 2025. Today, Tessa serves as the nurse at Redcliff Bible Camp, as well as in the music ministry, women’s Bible studies, and other areas of ministry at FBC. Heath serves as the Assistant Pastor, primarily leading the youth and music ministries.",
      verse: "Rejoicing in hope; patient in tribulation; continuing instant in prayer;",
      verseRef: "Romans 12:12 (KJV)",
      image: "/images/pastors/holmes-couple.jpg"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto text-center mb-14">
        <div className="text-[var(--color-gold-dark)] text-xs tracking-[3px]">CALLED TO SERVE</div>
        <h1 className="text-6xl tracking-tighter font-semibold mt-3 text-[var(--color-navy)]">Meet Our Pastors</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)]">Faithful shepherds who love Jesus, love His Word, and love this community deeply.</p>
      </div>

      <div className="space-y-16">
        {couples.map((couple, index) => (
          <div key={index} className="grid md:grid-cols-5 gap-10 items-center border-b pb-16 last:border-none last:pb-0">
            <div className="md:col-span-2">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-[var(--color-cream)] shadow-xl">
                <img 
                  src={couple.image} 
                  alt={couple.names}
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
            
            <div className="md:col-span-3">
              <div className="uppercase text-xs tracking-[2px] text-[var(--color-gold-dark)]">{couple.roles}</div>
              <h3 className="text-4xl font-semibold tracking-tight mt-1 text-[var(--color-navy)]">{couple.names}</h3>
              
              <blockquote className="mt-6 border-l-4 border-[var(--color-gold)] pl-5 italic text-lg text-[var(--color-stone)]">
                “{couple.verse}”<br />
                <span className="not-italic text-sm text-[var(--color-stone-light)]">— {couple.verseRef}</span>
              </blockquote>

              <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-stone)] max-w-prose">
                {couple.bio}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center bg-[var(--color-cream)] rounded-3xl p-10">
        <Users className="w-8 h-8 mx-auto text-[var(--color-gold-dark)] mb-4" />
        <div className="font-semibold text-xl text-[var(--color-navy)]">We’re here for you</div>
        <p className="text-[var(--color-stone)] mt-2 max-w-md mx-auto">The pastoral team is available for counseling, hospital visits, and prayer. Reach out anytime.</p>
        <a href="mailto:Firstbaptist646@gmail.com" className="inline-block mt-4 text-[var(--color-gold-dark)] hover:underline font-medium">Contact the Pastors →</a>
      </div>
    </div>
  );
}
