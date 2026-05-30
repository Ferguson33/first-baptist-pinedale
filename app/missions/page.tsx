export default function MissionsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">OUR HEART FOR THE WORLD</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Missions</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)] max-w-2xl mx-auto">
          We are committed to supporting those who are taking the gospel to the ends of the earth.
        </p>
      </div>

      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10 md:p-14 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-[var(--color-navy)] mb-4">Our Mission Support</h2>
          <p className="text-[var(--color-stone)]">
            By God’s grace, through Faith Promise giving, this church supports 15 missionaries worldwide at $150 per month each.
          </p>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-[var(--color-stone-light)]">
        If you have questions about our current mission partners, please contact the church office.
      </div>
    </div>
  );
}
