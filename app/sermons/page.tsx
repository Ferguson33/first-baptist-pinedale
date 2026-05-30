export default function SermonsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="uppercase text-xs tracking-[3px] text-[var(--color-gold-dark)]">VERSE BY VERSE PREACHING</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Sermons</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)] max-w-2xl mx-auto">
          We believe in the power of God’s Word taught clearly and faithfully.
        </p>
      </div>

      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-10 md:p-14 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-[var(--color-navy)] mb-4">Coming Soon</h2>
          <p className="text-[var(--color-stone)]">
            We are currently building out our sermon archive. Check back soon for recordings of Pastor Ted’s verse-by-verse teaching.
          </p>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-[var(--color-stone-light)]">
        In the meantime, you can hear Pastor Ted preach live every Sunday at 11:00 AM.
      </div>
    </div>
  );
}
