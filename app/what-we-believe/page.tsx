export default function WhatWeBelieve() {
  const beliefs = [
    {
      title: "The Bible",
      text: "We believe the Bible is the verbally inspired, inerrant, and infallible Word of God. As it is written, “All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness” (2 Timothy 3:16). Because it is “God-breathed,” it is historically, scientifically, and theologically accurate in all that it affirms. We preach and teach from the King James Version, and it is the Bible used in our pulpit and ministries. While we are committed to the KJV, we do not attack or condemn those who use other faithful translations."
    },
    {
      title: "God",
      text: "We believe in one true and living God, eternally existing in three persons: Father, Son, and Holy Spirit. He is the sovereign Creator, Sustainer, and Ruler of the universe."
    },
    {
      title: "Creation",
      text: "We believe in the literal, historical account of creation as recorded in Genesis. God created the heavens and the earth in six literal, consecutive days. We hold to a young earth position, consistent with the clear teaching of Scripture and the genealogies given in God’s Word."
    },
    {
      title: "Jesus Christ",
      text: "We believe in the deity of the Lord Jesus Christ, His virgin birth, sinless life, miracles, substitutionary death on the cross, bodily resurrection, ascension into heaven, and His personal, visible, and imminent return."
    },
    {
      title: "Salvation",
      text: "We believe that salvation is by grace alone through faith alone in Christ alone. It is the free gift of God, not of works, lest any man should boast. All who repent of their sin and place their faith in the finished work of Jesus Christ are born again and kept by the power of God."
    },
    {
      title: "The Church",
      text: "We believe the local church is a body of baptized believers, organized for worship, discipleship, fellowship, and the proclamation of the gospel. The two ordinances given to the church are believer’s baptism by immersion and the Lord’s Supper."
    },
    {
      title: "Last Things",
      text: "We believe in the personal, bodily, and imminent return of Jesus Christ. He will judge the living and the dead. The saved will enjoy eternal life with God; the lost will face eternal separation from Him."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <div className="uppercase text-xs text-[var(--color-gold-dark)] tracking-[3px]">OUR FOUNDATION</div>
        <h1 className="text-6xl font-semibold tracking-tighter mt-3 text-[var(--color-navy)]">What We Believe</h1>
        <p className="mt-4 text-xl text-[var(--color-stone)]">The unchanging truth of God’s Word guides everything we do.</p>
      </div>

      <div className="prose prose-lg max-w-none text-[var(--color-stone)]">
        <p className="lead text-xl">
          First Baptist Church of Pinedale is an independent, Bible-believing church. We most closely align with the Independent Fundamental Baptist position and are committed to the absolute authority and accuracy of the Word of God.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        {beliefs.map((belief, i) => (
          <div key={i} className="border-l-4 border-[var(--color-gold)] pl-7">
            <h3 className="font-semibold text-2xl text-[var(--color-navy)] tracking-tight">{belief.title}</h3>
            <p className="mt-2 text-lg leading-relaxed">{belief.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-[var(--color-navy)] text-white rounded-3xl p-10 text-center">
        <p className="text-xl font-light">“All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:”</p>
        <div className="text-sm text-[var(--color-gold-light)] mt-3">— 2 Timothy 3:16 (KJV)</div>
      </div>

      <div className="mt-10 text-sm text-center text-[var(--color-stone-light)]">
        A complete printed copy of the Constitution and Bylaws is available at the church office or by request.
      </div>
    </div>
  );
}
