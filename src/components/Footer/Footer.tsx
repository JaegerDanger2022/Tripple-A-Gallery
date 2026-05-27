"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ARTIST } from "@/lib/data";
import styles from "./Footer.module.css";

function ScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 400); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      className={styles.scrollTop}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    >
      ↑
    </button>
  );
}

export default function Footer() {
  const [first, ...rest] = ARTIST.name.split(" ");
  const last = rest.join(" ");

  return (
    <>
      <ScrollTop />
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
              <li><Link href="/studio">The Artist</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className={styles.col}>
            <h4>Service</h4>
            <ul>
              <li><Link href="/shipping">Shipping &amp; returns</Link></li>
              <li><Link href="/framing">Framing</Link></li>
              <li><Link href="/commissions">Commissions</Link></li>
              <li><Link href="/press">Press</Link></li>
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
    </>
  );
}
