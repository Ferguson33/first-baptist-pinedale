export default function PlanYourVisit() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-[15px]">
      <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-navy)]">Visitors Info</h1>
      <p className="text-xl mt-3">We can’t wait to meet you. Come as you are — jeans and boots are perfectly fine here.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-10">
        <div>
          <div className="font-semibold text-xl mb-2">What to Expect</div>
          <div className="space-y-2 text-[var(--color-stone)]">
            <div className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>Christ-centered, verse-by-verse preaching</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>Music that is reverent and joyful — you’ll hear hymns and congregational singing</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>Excellent, safe nursery available during services</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0">•</span>
              <span>A simple, welcoming atmosphere in a small mountain church</span>
            </div>
          </div>
        </div>

        <div>
          <div className="font-semibold text-xl mb-2">Service Times</div>
          <div className="space-y-1 text-[var(--color-stone)]">
            <div className="flex justify-between gap-4">
              <span>Sunday Breakfast Fellowship</span>
              <span className="font-medium text-right whitespace-nowrap">9:45 AM</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Sunday School (all ages)</span>
              <span className="font-medium text-right whitespace-nowrap">10:15 AM</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Teen Sunday School (6th–12th grade)</span>
              <span className="font-medium text-right whitespace-nowrap">10:15 AM</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Sunday Morning Worship</span>
              <span className="font-medium text-right whitespace-nowrap">11:00 AM</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Junior Church (ages 4–5th grade)</span>
              <span className="font-medium text-right whitespace-nowrap">during Worship</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Nursery available</span>
              <span className="font-medium text-right whitespace-nowrap">during services</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-[var(--color-stone-light)]">
            We do not currently have a Sunday evening service.
          </div>

          <div className="mt-8">
            <div className="font-semibold text-xl mb-2">Location</div>
            <div>646 N Tyler Ave<br />Pinedale, WY 82941</div>

            <div className="mt-4">
              <div className="font-semibold text-xl mb-1">Parking</div>
              <div className="text-[15px] text-[var(--color-stone)]">
                Parking is available in front of the SCSD #1 administration building and in the Wrangler Gym parking lot. They have graciously given us access to their parking areas.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-[var(--color-cream)] p-8 rounded-3xl text-[15px]">
        First time? Email us at <a href="mailto:Firstbaptist646@gmail.com" className="font-medium underline">Firstbaptist646@gmail.com</a> and let us know you’re coming. We’ll save you a seat.
      </div>

      {/* Google Map + Directions */}
      <div className="mt-12">
        <div className="font-semibold text-2xl mb-4 text-[var(--color-navy)]">Find Us on the Map</div>
        
        <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl overflow-hidden">
          {/* Google Map Embed */}
          <div className="aspect-[16/10] w-full">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3952.9656077879677!2d-109.86513397412055!3d42.873178715847466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87579403ca66d28f%3A0x769f4185e21da412!2s646%20N%20Tyler%20Ave%2C%20Pinedale%2C%20WY%2082941!5e0!3m2!1sen!2sus!4v1780176156005!5m2!1sen!2sus"
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="First Baptist Church Pinedale Location"
            />
          </div>

          {/* Directions Info */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-[var(--color-gold)]/10">
            <div>
              <div className="font-medium">646 N Tyler Ave, Pinedale, WY 82941</div>
              <div className="text-sm text-[var(--color-stone-light)] mt-0.5">
                Parking available in front of SCSD #1 or Wrangler Gym lots.
              </div>
            </div>

            <a
              href="https://www.google.com/maps/dir/?api=1&destination=646+N+Tyler+Ave,+Pinedale,+WY+82941"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--color-navy)] text-white rounded-full text-sm font-medium hover:bg-black transition-colors whitespace-nowrap"
            >
              Get Directions →
            </a>
          </div>
        </div>

        <p className="text-xs text-center text-[var(--color-stone-light)] mt-3">
          We’re located directly across from the SCSD #1 administration building. Parking available in front of SCSD #1 or the Wrangler Gym lots.
        </p>
      </div>
    </div>
  );
}
