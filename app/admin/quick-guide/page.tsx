"use client";

export default function PastorQuickGuide() {
  const printPage = () => window.print();

  return (
    <div className="max-w-[780px] mx-auto p-10 text-[13px] leading-tight print:p-8">
      <div className="text-center mb-8 border-b pb-6">
        <div className="font-semibold tracking-[1px] text-xl text-[var(--color-navy)]">FIRST BAPTIST CHURCH • PINEDALE</div>
        <div className="text-[var(--color-gold-dark)] text-xs tracking-[3px] mt-1">PASTOR QUICK REFERENCE GUIDE</div>
        <div className="text-xs text-[var(--color-stone-light)] mt-2">Print this page (File → Print → Save as PDF) and keep it by your desk</div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-8">
        <div>
          <div className="font-bold tracking-wider text-[var(--color-gold-dark)] mb-1">DAILY / WEEKLY TASKS</div>
          <ul className="space-y-1 text-[var(--color-stone)]">
            <li>1. Maintain the Prayer Bulletin Google Doc (members see it on the Prayer Bulletin page)</li>
            <li>1b. Maintain the Nursery Schedule Google Doc (members see it on the Nursery Schedule page)</li>
            <li>2. Check Admin → Members for new signup requests — approve, deny, or remove</li>
            <li>3. Add Sunday&apos;s sermon by Friday (title + YouTube link)</li>
            <li>4. Update Building Project progress after any milestone</li>
          </ul>

          <div className="mt-6">
            <div className="font-bold tracking-wider text-[var(--color-gold-dark)] mb-1">UPLOADING PHOTOS</div>
            <ol className="text-[var(--color-stone)] list-decimal pl-4 space-y-0.5">
              <li>Go to Admin Dashboard</li>
              <li>Choose the Building Project or Youth tab</li>
              <li>Drag photo files directly onto the dashed box</li>
              <li>Type a short caption when prompted (Building tab)</li>
            </ol>
          </div>
        </div>

        <div>
          <div className="font-bold tracking-wider text-[var(--color-gold-dark)] mb-1">ADDING A SERMON</div>
          <ol className="text-[var(--color-stone)] list-decimal pl-4 space-y-0.5">
            <li>Record or upload to YouTube first</li>
            <li>Admin → Sermons → &quot;Add Sermon&quot;</li>
            <li>Paste the YouTube link or video ID</li>
            <li>Choose display: Automatic (newest embeds), Always embed, or YouTube link only</li>
          </ol>

          <div className="mt-6">
            <div className="font-bold tracking-wider text-[var(--color-gold-dark)] mb-1">MEMBER APPROVALS</div>
            <p className="text-[var(--color-stone)]">
              New signups appear as &quot;Pending.&quot; Approve to give access to the Directory, Prayer Bulletin, and Nursery Schedule.
              Deny removes a pending signup. Remove deletes an approved member&apos;s login (they can sign up again later).
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] text-[var(--color-stone-light)]">
        646 N Tyler Ave, Pinedale, WY 82941 • (307) 367-4567 • Firstbaptist646@gmail.com<br />
        &ldquo;Well done, thou good and faithful servant: thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord.&rdquo; — Matthew 25:21 (KJV)
      </div>

      <button onClick={printPage} className="no-print mt-8 mx-auto block px-8 py-2.5 text-xs border rounded-full hover:bg-[var(--color-cream)]">PRINT / SAVE AS PDF</button>
    </div>
  );
}