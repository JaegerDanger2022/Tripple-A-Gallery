"use client";

import Link from "next/link";
import { ARTIST } from "@/lib/data";
import styles from "./Footer.module.css";

export default function Footer() {
  const [first, ...rest] = ARTIST.name.split(" ");
  const last = rest.join(" ");

  return (
    <footer className={styles.ft}>
      <div className={styles.inner}>
        <div className={styles.col}>
          <div className={styles.brand}>
            <span className={styles.brandName}><em>{first}</em> {last}</span>
          </div>
          <p className={styles.blurb}>Original artworks, collage and mixed-media works by Ama Antwiwaa Amponsah (Triple "A"), {ARTIST.based}.</p>
        </div>
        <div className={styles.col}>
          <h4>Visit</h4>
          <ul>
            <li><Link href="/">Works</Link></li>
            <li><Link href="/?filter=Print">Editions</Link></li>
            <li><Link href="/studio">The Artist</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div className={styles.col}>
          <h4>Service</h4>
          <ul>
            <li>Shipping &amp; returns</li>
            <li>Framing</li>
            <li>Commissions</li>
            <li>Press</li>
          </ul>
        </div>
        <div className={styles.col}>
          <h4>Letter</h4>
          <p className={styles.blurb}>A short note when new lots are available. A few times a year, no more.</p>
          <form className={styles.sub} onSubmit={(e) => e.preventDefault()}>
            <input placeholder="your@email" />
            <button type="submit">→</button>
          </form>
        </div>
      </div>
      <div className={styles.base}>
        <span>© {ARTIST.name}, 2026</span>
        <span className="mono">Triple A Gallery · {ARTIST.based}</span>
        <span>Terms · Privacy</span>
      </div>
    </footer>
  );
}
