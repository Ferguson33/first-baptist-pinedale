"use client";

export default function GivePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-[3px] text-[var(--color-gold-dark)]">GENEROUS HEARTS, FAITHFUL HANDS</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">Give</h1>
        <p className="mt-4 max-w-prose mx-auto text-lg">“Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver.” — 2 Corinthians 9:7 (KJV)</p>
      </div>

      <div className="bg-white border border-[var(--color-gold)]/20 rounded-3xl p-9 md:p-12">
        {/* ZEFFY GIVING FORM */}
        <div className="rounded-2xl border border-[var(--color-gold)]/20 bg-white p-2 md:p-3">
          <iframe
            src="https://www.zeffy.com/en-US/donation-form/first-baptist-church-giving"
            width="100%"
            height="1100"
            frameBorder="0"
            allow="payment"
            title="First Baptist Church Pinedale - Give Online"
            className="w-full rounded-xl"
            style={{ minHeight: '900px', border: 'none' }}
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 text-center text-xs">
          <div className="bg-[var(--color-cream)] p-4 rounded-xl">
            <div className="font-semibold">One-Time Gift</div>
            <div className="text-[var(--color-stone-light)]">Give any amount, any time</div>
          </div>
          <div className="bg-[var(--color-cream)] p-4 rounded-xl">
            <div className="font-semibold">Recurring Gift</div>
            <div className="text-[var(--color-stone-light)]">Weekly, monthly, or quarterly</div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs mt-8 text-[var(--color-stone-light)] max-w-xs mx-auto">
        All gifts are tax-deductible. You will receive a year-end giving statement. Questions? Contact our treasurer at <a href="mailto:Firstbaptist646@gmail.com" className="underline">Firstbaptist646@gmail.com</a>.
      </div>
    </div>
  );
}
