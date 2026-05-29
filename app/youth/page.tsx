"use client";

import React from 'react';

export default function YouthMinistry() {
  const events = [
    { date: "March 15", title: "Winter Retreat", time: "All day", desc: "Sledding + teaching at the York cabin on Fremont Lake. $15 includes food." },
    { date: "April 12", title: "Serve Day", time: "9 AM – 2 PM", desc: "Serving our seniors with yard work and home projects around Pinedale." },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="max-w-2xl">
        <div className="text-xs text-[var(--color-gold-dark)] tracking-widest">GRADES 6–12</div>
        <h1 className="text-6xl tracking-tighter font-semibold text-[var(--color-navy)] mt-2">Youth Ministry</h1>
        <p className="text-xl mt-4">Real faith for real life. We want every student in Sublette County to know that Jesus is worth everything.</p>
      </div>

      <div className="mt-12 grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <div className="font-semibold tracking-tight text-2xl mb-5">Upcoming Youth Events</div>
          <div className="space-y-4">
            {events.map((e, i) => (
              <div key={i} className="border-l-4 border-[var(--color-gold)] pl-5">
                <div className="text-xs text-[var(--color-gold-dark)]">{e.date} • {e.time}</div>
                <div className="font-semibold text-xl">{e.title}</div>
                <p className="text-sm mt-1 text-[var(--color-stone)]">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-[var(--color-cream)] p-7 rounded-3xl text-sm">
          <div className="font-semibold mb-4">Led by Heath &amp; Tessa Holmes</div>
          <p>Heath and Tessa have a passion for making the gospel clear and helping students build friendships that last. Parents are always welcome at any youth event.</p>
          <a href="mailto:Firstbaptist646@gmail.com" className="block mt-5 text-[var(--color-gold-dark)] font-medium">Contact Heath &amp; Tessa →</a>
        </div>
      </div>

      {/* Photo gallery placeholder */}
      <div className="mt-14">
        <div className="font-semibold mb-4">Recent Photos</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1011, 1005, 1012, 160].map((id, i) => (
            <div key={i} className="aspect-square bg-[var(--color-cream)] rounded-2xl overflow-hidden">
              <img src={`https://picsum.photos/id/${id}/600/600`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="text-xs text-center mt-3 text-[var(--color-stone-light)]">More photos are added regularly by the youth leaders in the admin dashboard.</div>
      </div>
    </div>
  );
}
