"use client";

import { useState } from "react";
import styles from "./contact.module.css";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", note: "", interest: "general" });

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
          <h4>Direct</h4>
          <p><a href="mailto:studio@marenholloway.art">studio@marenholloway.art</a></p>
          <p>+44 131 555 0184</p>

          <h4>Studio</h4>
          <p>14 Patriothall Lane,<br />Edinburgh EH3 5AY,<br />Scotland.</p>

          <h4>Visit</h4>
          <p>By appointment, Thursdays &amp; Fridays.</p>

          <h4>Representation</h4>
          <p>Ingleby Gallery — UK<br />Karsten Schubert — international</p>
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
