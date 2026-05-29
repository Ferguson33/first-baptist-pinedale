"use client";

import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // In production this would save to Supabase inquiries table + send email via Resend/Zepty/etc.
    setSent(true);
    toast.success("Thank you. We received your message and will reply within 48 hours.");
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-tight">Contact Us</h1>
      <p className="mt-3 text-[var(--color-stone)]">We would love to hear from you. Pastors Ted and Heath personally read every message.</p>

      {sent ? (
        <div className="mt-10 p-8 bg-[var(--color-cream)] rounded-3xl text-center">
          Thank you! Your message has been received.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <input required placeholder="Your name" className="border border-[var(--color-gold)]/30 px-5 py-3 rounded-2xl" />
            <input required type="email" placeholder="Email address" className="border border-[var(--color-gold)]/30 px-5 py-3 rounded-2xl" />
          </div>
          <textarea required placeholder="How can we help you?" className="w-full border border-[var(--color-gold)]/30 px-5 py-4 rounded-3xl min-h-[150px]" />
          <button type="submit" className="w-full bg-[var(--color-navy)] text-white py-4 rounded-2xl font-semibold">Send Message</button>
        </form>
      )}

      <div className="text-xs mt-8 text-center text-[var(--color-stone-light)]">
        646 N Tyler Ave, Pinedale, WY 82941<br />
        (307) 367-4567 • Firstbaptist646@gmail.com
      </div>
    </div>
  );
}
