import Link from 'next/link';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[var(--color-navy-dark)] text-white/90 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-x-8 gap-y-12">
        {/* Church Info */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[var(--color-gold)] flex items-center justify-center">
              <span className="text-[var(--color-navy)] text-xl">✝</span>
            </div>
            <span className="font-semibold text-white text-xl tracking-tight">First Baptist Church</span>
          </div>
          <p className="text-sm text-white/70 max-w-xs">
            “The Bible as it is, for men as they are.”
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-3 text-sm">
          <div className="font-semibold text-white tracking-wide mb-2">Visit Us</div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-gold)]" />
            <div>
              646 N Tyler Ave<br />
              Pinedale, WY 82941
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 flex-shrink-0 text-[var(--color-gold)]" />
            <a href="tel:3073674567" className="hover:text-white">(307) 367-4567</a>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 flex-shrink-0 text-[var(--color-gold)]" />
            <a href="mailto:Firstbaptist646@gmail.com" className="hover:text-white">Firstbaptist646@gmail.com</a>
          </div>
        </div>

        {/* Service Times */}
        <div className="space-y-3 text-sm">
          <div className="font-semibold text-white tracking-wide mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-gold)]" /> Service Times
          </div>
          <div className="space-y-1.5 text-white/80">
            <div><span className="text-white/60">Sunday School</span> — 9:00 AM</div>
            <div><span className="text-white/60">Sunday Worship</span> — 10:15 AM</div>
            <div><span className="text-white/60">Wednesday Bible Study</span> — 7:00 PM</div>
            <div><span className="text-white/60">Youth Group (Wed)</span> — 6:30 PM</div>
          </div>
          <Link href="/visit" className="inline-block mt-3 text-[var(--color-gold-light)] hover:text-[var(--color-gold)] text-sm font-medium">
            Visitors Info →
          </Link>
        </div>
      </div>

      <div className="mt-14 pt-8 border-t border-white/10 text-center text-xs text-white/50 max-w-7xl mx-auto px-6">
        © {new Date().getFullYear()} First Baptist Church of Pinedale. All are welcome. <br className="sm:hidden" />
        <span className="hidden sm:inline">·</span> “For where two or three are gathered together in my name, there am I in the midst of them.” — Matthew 18:20 (KJV)
      </div>
    </footer>
  );
}
