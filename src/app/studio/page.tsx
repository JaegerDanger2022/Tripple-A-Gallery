"use client";

import { useRouter } from "next/navigation";
import { ARTIST, ARTWORKS } from "@/lib/data";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import styles from "./studio.module.css";

export default function StudioPage() {
  const router = useRouter();
  const featured = ARTWORKS[5]; // Inland Sea
  const [first, last] = ARTIST.name.split(" ");

  return (
    <main className={styles.about}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className="kicker">Studio · {ARTIST.based}</div>
          <h1 className={styles.title}><em>{first}</em>{" "}{last}</h1>
          <p className={styles.statement}>{ARTIST.statement}</p>
        </div>
        <div className={styles.portrait}>
          <ArtPlaceholder artwork={featured} ratio="portrait" showLabel={false} />
          <div className={styles.portraitCap}>Studio, March 2026 — portrait by I. Khaled</div>
        </div>
      </section>

      <section className={styles.bio}>
        {ARTIST.bio.map((p, i) => <p key={i}>{p}</p>)}
      </section>

      <section className={styles.cv}>
        <h2>Selected exhibitions</h2>
        <dl className={styles.cvList}>
          <div><dt>2026</dt><dd>Recent Works, Atelier Holloway, online · solo</dd></div>
          <div><dt>2025</dt><dd>Folded Light, Ingleby Gallery, Edinburgh · solo</dd></div>
          <div><dt>2024</dt><dd>Field Studies, Karsten Schubert, London · solo</dd></div>
          <div><dt>2023</dt><dd>Five Painters, Royal Scottish Academy, Edinburgh · group</dd></div>
          <div><dt>2022</dt><dd>Drawings, Drawing Room residency, Skye · solo</dd></div>
          <div><dt>2020</dt><dd>Interiors, Tate Modern Late, London · talk + display</dd></div>
        </dl>

        <h2>Collections</h2>
        <ul className={styles.cvCols}>
          <li>The Fleming Foundation</li>
          <li>British Council Collection</li>
          <li>Scottish National Galleries (works on paper)</li>
          <li>Ingleby Gallery, Edinburgh</li>
          <li>Private collections, UK &amp; EU</li>
        </ul>
      </section>

      <section className={styles.ctaRow}>
        <div>
          <h3>Quiet works are uploaded as they leave the studio.</h3>
          <p>A short, irregular letter — three or four times a year, no more.</p>
        </div>
        <form className={styles.ctaSub} onSubmit={(e) => e.preventDefault()}>
          <input placeholder="your@email" />
          <button type="submit">Subscribe →</button>
        </form>
      </section>
    </main>
  );
}
