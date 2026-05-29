export default function PlanYourVisit() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-navy)]">Visitors Info</h1>
      <p className="text-xl mt-3">We can’t wait to meet you. Come as you are — jeans and boots are perfectly fine here.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-10 text-sm">
        <div>
          <div className="font-semibold text-lg mb-2">What to Expect</div>
          <ul className="space-y-2 text-[var(--color-stone)]">
            <li>• Christ-centered, verse-by-verse preaching</li>
            <li>• Music that is reverent and joyful — you’ll hear hymns and congregational singing</li>
            <li>• Excellent, safe nursery available during services</li>
            <li>• A simple, welcoming atmosphere in a small mountain church</li>
          </ul>
        </div>

        <div>
          <div className="font-semibold text-lg mb-2">Service Times</div>
          <div className="space-y-1 text-[var(--color-stone)]">
            <div>Sunday Breakfast Fellowship — 9:45 AM</div>
            <div>Sunday School (all ages) — 10:15 AM</div>
            <div>Sunday Morning Worship — 11:00 AM</div>
            <div>Nursery available during Sunday School and Worship</div>
          </div>
          <div className="mt-3 text-xs text-[var(--color-stone-light)]">
            We do not currently have a Sunday evening or Wednesday service.
          </div>

          <div className="mt-8">
            <div className="font-semibold text-lg mb-2">Location</div>
            <div>646 N Tyler Ave<br />Pinedale, WY 82941</div>
            <div className="mt-1 text-xs text-[var(--color-stone-light)]">Just two blocks north of the high school, easy parking on the east side of the building.</div>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-[var(--color-cream)] p-8 rounded-3xl text-sm">
        First time? Email us at <a href="mailto:Firstbaptist646@gmail.com" className="font-medium underline">Firstbaptist646@gmail.com</a> and let us know you’re coming. We’ll save you a seat and have a welcome packet ready.
      </div>
    </div>
  );
}
