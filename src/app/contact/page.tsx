"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./contact.module.css";

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactInner />
    </Suspense>
  );
}

function ContactInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lot = searchParams.get("lot");

  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", note: "", interest: "general" });

  // Prefill name/email from the signed-in account, without clobbering edits.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.displayName || "",
      email: f.email || user.email || "",
    }));
  }, [user]);

  // Arriving from a work's "Contact us about this original" — prefill intent + note.
  useEffect(() => {
    if (!lot) return;
    setForm((f) => ({
      ...f,
      interest: "purchase",
      note: f.note || `I'd like to purchase the original of Lot ${lot}. Please let me know about availability, price, and next steps.`,
    }));
  }, [lot]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <main className={styles.contact}>
      <section className={styles.hero}>
        <div className="kicker">Studio · enquiries</div>
        <h1 className={styles.heroTitle}>
          A note to <em>the studio</em>.
        </h1>
      </section>

      <div className={styles.grid}>
        <div className={styles.side}>
          <h4>Phone</h4>
          <p>
            <a href="tel:+447946654716">+44 7946 654716</a><br />
            <a href="tel:+447415690048">+44 7415 690048</a><br />
            <a href="tel:+447984229211">+44 7984 229211</a><br />
            <a href="tel:+233245500678">+233 245 500678</a>
          </p>

          <h4>Studio</h4>
          <p>167–169 Great Portland Street,<br />London W1W 5PF,<br />United Kingdom.</p>
        </div>

        {!sent ? (
          <form className={`form ${styles.form}`} onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <div className="form-row">
              <label className="field">
                <span className="field-lbl">Name</span>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </label>
              <label className="field">
                <span className="field-lbl">Email</span>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </label>
            </div>
            <label className="field">
              <span className="field-lbl">In regard to</span>
              <select value={form.interest} onChange={(e) => set("interest", e.target.value)}>
                <option value="general">General enquiry</option>
                <option value="purchase">Purchasing an original</option>
                <option value="work">A specific work</option>
                <option value="commission">A commission</option>
                <option value="press">Press / publication</option>
                <option value="visit">Studio visit</option>
              </select>
            </label>
            <label className="field">
              <span className="field-lbl">Note</span>
              <textarea rows={6} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="A few lines is plenty." />
            </label>
            <button className="primary" type="submit">Send →</button>
          </form>
        ) : (
          <div className={styles.sent}>
            <div className="kicker">Sent · {new Date().toLocaleDateString("en-GB")}</div>
            <h2><em>Thank you.</em><br />The studio reads everything within a week.</h2>
          </div>
        )}
      </div>
    </main>
  );
}
