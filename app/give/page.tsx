"use client";

export default function GivePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="text-xs uppercase tracking-[3px] text-[var(--color-gold-dark)]">GENEROUS HEARTS, FAITHFUL HANDS</div>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Give</h1>
        <p className="mt-4 max-w-prose mx-auto text-base sm:text-lg text-[var(--color-stone)]">
          “Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver.” — 2 Corinthians 9:7 (KJV)
        </p>
      </div>

      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-5 sm:p-8 md:p-12">
        {/* Quick Options - Stacks nicely on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 text-center text-sm">
          <div className="bg-[var(--color-cream)] p-4 sm:p-5 rounded-2xl">
            <div className="font-semibold text-[var(--color-navy)]">One-Time Gift</div>
            <div className="text-[var(--color-stone-light)] mt-0.5 text-xs sm:text-sm">Give any amount, any time</div>
          </div>
          <div className="bg-[var(--color-cream)] p-4 sm:p-5 rounded-2xl">
            <div className="font-semibold text-[var(--color-navy)]">Recurring Gift</div>
            <div className="text-[var(--color-stone-light)] mt-0.5 text-xs sm:text-sm">Weekly, monthly, or quarterly</div>
          </div>
        </div>

        {/* ZEFFY GIVING FORM - Cleaner mobile presentation */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="font-semibold text-lg text-[var(--color-navy)]">Give Online</div>
            <div className="text-[10px] text-[var(--color-stone-light)] hidden sm:block">Secure • Powered by Zeffy</div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-[var(--color-gold)]/15 bg-[#f9f7f2]">
            <iframe
              src="https://www.zeffy.com/en-US/donation-form/first-baptist-church-giving"
              width="100%"
              height="1050"
              frameBorder="0"
              allow="payment"
              title="First Baptist Church Pinedale - Give Online"
              className="w-full block"
              style={{ 
                minHeight: '820px',
                border: 'none',
                backgroundColor: '#f9f7f2'
              }}
            />
          </div>
          <p className="text-center text-[10px] text-[var(--color-stone-light)] mt-2">The form below is secure and hosted by Zeffy (no fees to the church).</p>
        </div>
      </div>

      <div className="text-center text-xs mt-6 sm:mt-8 text-[var(--color-stone-light)] max-w-sm mx-auto px-4">
        All gifts are tax-deductible. You will receive a year-end giving statement.<br className="hidden sm:block" />
        Questions? Contact our treasurer at <a href="mailto:Firstbaptist646@gmail.com" className="underline">Firstbaptist646@gmail.com</a>.
      </div>
    </div>
  );
}
