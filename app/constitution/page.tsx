"use client";

import { useState } from 'react';
import { jsPDF } from 'jspdf';

export default function ConstitutionPage() {
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = () => {
    setDownloading(true);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("FIRST BAPTIST CHURCH", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Pinedale, Wyoming", 105, 27, { align: "center" });
    doc.text("CONSTITUTION & BYLAWS", 105, 34, { align: "center" });

    doc.setFontSize(11);
    const text = `
Adopted: March 12, 1989 • Last Amended: January 14, 2024

ARTICLE I — NAME
The name of this church shall be First Baptist Church of Pinedale, located at 646 N Tyler Ave, Pinedale, Wyoming.

ARTICLE II — PURPOSE
The purpose of this church is to glorify God through worship, evangelism, discipleship, ministry, and fellowship in obedience to the Great Commission (Matthew 28:18-20).

ARTICLE III — STATEMENT OF FAITH
This church holds to the Baptist Faith and Message 2000 as our doctrinal statement. We believe the Bible is the inspired Word of God...

ARTICLE IV — MEMBERSHIP
Membership is open to all who have trusted Jesus Christ as Lord and Savior, have been baptized by immersion, and who agree with the church’s statement of faith and constitution.

ARTICLE V — OFFICERS
The officers of the church shall be the Pastor, Assistant Pastor(s), Deacons, Clerk, and Treasurer. The Pastor and Assistant Pastor(s) shall be called by a three-fourths vote of the active membership.

ARTICLE VI — MEETINGS
The church shall hold regular business meetings quarterly. Special meetings may be called by the Pastor or by written request of ten percent of the active members.

ARTICLE VII — ORDINANCES
We observe two ordinances given by our Lord: Believer’s Baptism by immersion and the Lord’s Supper (open to all believers).

ARTICLE VIII — CHURCH DISCIPLINE
The church shall practice loving, redemptive church discipline according to Matthew 18:15-17 and Galatians 6:1.

ARTICLE IX — PROPERTY
All property of the church is held in trust for the use and benefit of the members who adhere to the constitution and statement of faith.

ARTICLE X — AMENDMENTS
This constitution may be amended by a two-thirds vote of active members present at a duly called business meeting, provided the proposed amendment has been presented in writing at least thirty days prior.

BYLAWS
Detailed operating procedures, including committee structures, financial policies, and staff job descriptions, are maintained in the separate Bylaws document available from the church office.

CONTACT
First Baptist Church • 646 N Tyler Ave • Pinedale, WY 82941 • (307) 367-4567
    `.trim();

    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, 20, 48);
    
    doc.save("FBC-Pinedale-Constitution.pdf");
    setDownloading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <div className="text-xs uppercase tracking-[2px] text-[var(--color-gold-dark)]">GOVERNING DOCUMENT</div>
          <h1 className="text-5xl font-semibold tracking-tight text-[var(--color-navy)]">Church Constitution</h1>
        </div>
        <button 
          onClick={downloadPDF} 
          disabled={downloading}
          className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm rounded-full font-medium disabled:opacity-60"
        >
          {downloading ? "Generating..." : "Download PDF"}
        </button>
      </div>

      <div className="prose prose-stone max-w-none mt-10 text-[15px] leading-relaxed text-[var(--color-stone)]">
        <p className="text-sm text-[var(--color-stone-light)]">Adopted March 12, 1989 • Last Amended January 14, 2024</p>

        <h3>ARTICLE I — NAME</h3>
        <p>The name of this church shall be <strong>First Baptist Church of Pinedale</strong>, located at 646 N Tyler Ave, Pinedale, Sublette County, Wyoming 82941.</p>

        <h3>ARTICLE II — PURPOSE</h3>
        <p>The purpose of this church is to glorify God by making disciples of Jesus Christ through worship, evangelism, discipleship, ministry, and fellowship, in obedience to the Great Commission (Matthew 28:18–20) and the Great Commandment (Matthew 22:37–40).</p>

        <h3>ARTICLE III — STATEMENT OF FAITH</h3>
        <p>This church subscribes to the Baptist Faith and Message 2000 as our doctrinal statement. We believe the sixty-six books of the Old and New Testaments are the inspired, inerrant, and infallible Word of God. We believe in one God eternally existing in three persons...</p>

        <h3>ARTICLE IV — MEMBERSHIP</h3>
        <p>Membership is granted to those who have personally trusted in Jesus Christ as Lord and Savior, have been baptized by immersion following their profession of faith, and who agree to submit to the leadership, doctrine, and constitution of this local church.</p>

        <h3>ARTICLE V — CHURCH OFFICERS & LEADERSHIP</h3>
        <p>The church shall be led by the Senior Pastor and Assistant Pastor(s) under the authority of the active membership. Deacons shall be elected to serve the practical needs of the body. All officers must meet the biblical qualifications found in 1 Timothy 3 and Titus 1.</p>

        <h3>ARTICLE VI — ORDINANCES</h3>
        <p>We observe two ordinances: (1) Believer’s Baptism by immersion, and (2) the Lord’s Supper, observed regularly and open to all who are genuinely trusting in Christ.</p>

        <div className="my-8 p-6 bg-[var(--color-cream)] rounded-xl text-sm border-l-4 border-[var(--color-gold)]">
          A complete printed copy of the Constitution and Bylaws is available at the church office or by request. For pastoral questions regarding our governing documents, please contact Pastor Ted York.
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-[var(--color-stone-light)]">
        First Baptist Church of Pinedale • “Holding fast the faithful word” — Titus 1:9
      </div>
    </div>
  );
}
