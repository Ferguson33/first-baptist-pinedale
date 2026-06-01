export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tighter text-[var(--color-navy)] mb-2">Privacy Policy</h1>
      <p className="text-[var(--color-stone-light)] mb-10">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-stone max-w-none text-[var(--color-stone)] space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Information We Collect</h2>
          <p>
            When you use our website or make a donation, we may collect the following information:
          </p>
          <ul>
            <li>Contact information (name, email address, phone number) when you sign up for an account or make a donation.</li>
            <li>Donation details processed through our trusted third-party provider, Zeffy.</li>
            <li>Basic usage information (such as pages visited) to improve the site experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Process and record your donations</li>
            <li>Send you giving statements and tax receipts</li>
            <li>Communicate with you about church activities (if you’ve opted in)</li>
            <li>Improve and maintain our website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Donations &amp; Payment Information</h2>
          <p>
            All online donations are processed securely through <strong>Zeffy</strong>, a trusted donation platform used by thousands of churches and nonprofits. 
            We do <strong>not</strong> collect, store, or have access to your credit card or payment information. 
            Zeffy is PCI-DSS compliant and handles all payment processing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Data Sharing</h2>
          <p>
            We do not sell or rent your personal information. We only share information with trusted service providers (such as Zeffy) as necessary to provide our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Data Security</h2>
          <p>
            We take reasonable measures to protect your information. However, no method of transmission over the Internet is 100% secure. 
            For the highest level of payment security, all donations are processed directly through Zeffy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal information by contacting us at{' '}
            <a href="mailto:Firstbaptist646@gmail.com" className="underline">Firstbaptist646@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-navy)]">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:Firstbaptist646@gmail.com" className="underline">Firstbaptist646@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-12 text-sm text-[var(--color-stone-light)] border-t pt-6">
        First Baptist Church of Pinedale, Wyoming
      </div>
    </div>
  );
}
