export default function EventsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">JOIN US</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Events &amp; Schedule</h1>
        <p className="mt-4 text-lg text-[var(--color-stone)] max-w-2xl mx-auto">
          We are a small church in a high mountain town. Come as you are — we’d love to have you with us.
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="mb-16">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)] mb-6">Our Weekly Schedule</h2>

        <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-8 md:p-10">
          <div className="space-y-6 text-lg">
            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Sunday Breakfast Fellowship</div>
              <div className="text-[var(--color-stone)]">9:45 AM — Potluck-style breakfast. Come and enjoy good food and fellowship.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Sunday School</div>
              <div className="text-[var(--color-stone)]">10:15 AM</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start">
              <div className="font-semibold text-[var(--color-navy)]">Morning Worship</div>
              <div className="text-[var(--color-stone)]">11:00 AM — Pastor Ted York preaches verse by verse through the Bible.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-x-8 gap-y-1 md:items-start border-t pt-6 mt-2">
              <div className="font-semibold text-[var(--color-navy)]">Nursery</div>
              <div className="text-[var(--color-stone)]">
                Available during Sunday School and the morning service.
                {/* TODO: Replace this placeholder link with the actual Google Calendar share link for nursery scheduling */}
                <div className="mt-1">
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-gold-dark)] underline hover:no-underline text-sm font-medium"
                  >
                    Nursery Volunteer Schedule
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t text-sm text-[var(--color-stone-light)]">
            We currently do not have a Sunday evening service or a Wednesday service. We are a small congregation and value the time together we do have on Sunday mornings.
          </div>
        </div>
      </div>

      {/* Google Calendar Placeholder */}
      <div className="mb-16">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-navy)] mb-4">Events Calendar</h2>
        <p className="text-[var(--color-stone)] mb-6">
          Special events, fellowships, and activities will appear here once our church calendar is set up.
        </p>

        {/* Placeholder for Google Calendar Embed */}
        <div className="border-2 border-dashed border-[var(--color-gold)]/40 rounded-3xl p-10 md:p-16 bg-[var(--color-cream)] text-center min-h-[420px] flex flex-col items-center justify-center">
          <div className="max-w-md">
            <div className="font-semibold text-xl text-[var(--color-navy)] mb-3">
              Google Calendar Embed
            </div>
            <p className="text-[var(--color-stone)] mb-4">
              A public Google Calendar will be embedded here. Events can then be easily added and updated by the church.
            </p>
            <div className="text-xs text-[var(--color-stone-light)]">
              (Placeholder — ready for the embed code when the calendar is created)
            </div>
          </div>
        </div>
      </div>

      {/* Choir & Ministry Notes */}
      <div className="max-w-2xl">
        <h3 className="font-semibold text-xl text-[var(--color-navy)] mb-3">Current Ministry Notes</h3>
        <ul className="space-y-2 text-[var(--color-stone)]">
          <li>• Pastor Ted York preaches verse-by-verse through the Scriptures.</li>
          <li>• We are excited to be starting a choir.</li>
          <li>• Coffee is always available.</li>
        </ul>
      </div>


    </div>
  );
}
