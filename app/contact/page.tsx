"use client";

import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const subject = encodeURIComponent(`Website message from ${name}`);
    const body = encodeURIComponent(`From: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:Firstbaptist646@gmail.com?subject=${subject}&body=${body}`;

    setSent(true);
    toast.success("Your email app should open so you can send your message.");
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-tight">Contact Us</h1>
      <p className="mt-3 text-[var(--color-stone)]">We would love to hear from you. Pastors Ted and Heath personally read every message.</p>

      {sent ? (
        <div className="mt-10 p-8 bg-[var(--color-cream)] rounded-3xl text-center space-y-3">
          <p>Thank you. If your email app opened, send the message from there and we will reply as soon as we can.</p>
          <p className="text-sm text-[var(--color-stone-light)]">
            Prefer to call? <a href="tel:+13073674567" className="underline">(307) 367-4567</a>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <input required name="name" placeholder="Your name" className="border border-[var(--color-gold)]/30 px-5 py-3 rounded-2xl" />
            <input required name="email" type="email" placeholder="Email address" className="border border-[var(--color-gold)]/30 px-5 py-3 rounded-2xl" />
          </div>
          <textarea required name="message" placeholder="How can we help you?" className="w-full border border-[var(--color-gold)]/30 px-5 py-4 rounded-3xl min-h-[150px]" />
          <button type="submit" className="w-full bg-[var(--color-navy)] text-white py-4 rounded-2xl font-semibold">Send Message</button>
          <p className="text-xs text-center text-[var(--color-stone-light)]">
            This opens your email app with your message ready to send.
          </p>
        </form>
      )}

      <div className="text-xs mt-8 text-center text-[var(--color-stone-light)]">
        646 N Tyler Ave, Pinedale, WY 82941<br />
        <a href="tel:+13073674567" className="hover:underline">(307) 367-4567</a> • <a href="mailto:Firstbaptist646@gmail.com" className="hover:underline">Firstbaptist646@gmail.com</a>
      </div>
    </div>
  );
}