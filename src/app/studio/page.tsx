"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ARTIST } from "@/lib/data";
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer";
import styles from "./studio.module.css";

const NUM_SLIDES = 8;
const SLIDES = Array.from({ length: NUM_SLIDES }, (_, i) => ({
  src: `/profile/slide-${String(i + 1).padStart(2, "0")}.png`,
  alt: `Artist profile — page ${i + 1}`,
}));

// ── Slideshow component ───────────────────────────────────────────────────────
function ProfileSlideshow() {
  const [idx, setIdx] = useState(0);

  function prev() { setIdx((i) => (i - 1 + NUM_SLIDES) % NUM_SLIDES); }
  function next() { setIdx((i) => (i + 1) % NUM_SLIDES); }

  return (
    <div className={styles.slideshow}>
      <div className={styles.slideImgWrap} key={idx}>
        <img
          src={`${SLIDES[idx].src}?v=2`}
          alt={SLIDES[idx].alt}
          className={styles.slideImg}
        />
      </div>

      {/* Controls bar below image */}
      <div className={styles.slideControls}>
        <button className={styles.slideArrow} onClick={prev} aria-label="Previous">
          <ChevronLeft size={18} strokeWidth={1.6} />
        </button>
        <div className={styles.slideDots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === idx ? styles.dotOn : ""}`}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <span className={styles.slideNum}>{idx + 1} / {NUM_SLIDES}</span>
        <button className={styles.slideArrow} onClick={next} aria-label="Next">
          <ChevronRight size={18} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ArtistPage() {
  const [first, ...rest] = ARTIST.name.split(" ");
  const last = rest.join(" ");

  return (
    <main className={styles.about}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className="kicker">Triple "A" · {ARTIST.based}</div>
          <h1 className={styles.title}><em>{first}</em>{" "}{last}</h1>
          <p className={styles.statement}>{ARTIST.statement}</p>
        </div>
        <div className={styles.portrait}>
          <img
            src="/profile/Ama at work in her studio.png"
            alt="Ama at work in her studio"
            style={{ width: "100%", borderRadius: 4, display: "block" }}
          />
          <div className={styles.portraitCap}>Ama at work in her studio</div>
        </div>
      </section>

      {/* Bio */}
      <section className={styles.bio}>
        {ARTIST.bio.map((p, i) => <p key={i}>{p}</p>)}
      </section>

      {/* Video */}
      <section className={styles.videoSection}>
        <div className={styles.videoLabel}>
          <div className="kicker">GUBA Exhibition</div>
        </div>
        <VideoPlayer src="https://storage.googleapis.com/tripple-a-gallery.firebasestorage.app/videos/video.mp4" label="Watch" />
      </section>

      {/* Artist at Work videos */}
      <section className={styles.videoGrid}>
        <div className={styles.videoGridLabel}>
          <div className="kicker">Artist at Work</div>
        </div>
        <div className={styles.videoGridRow}>
          <VideoPlayer src="https://storage.googleapis.com/tripple-a-gallery.firebasestorage.app/videos/artist%20at%20work.mp4" label="Watch" aspectRatio="9/16" />
          <VideoPlayer src="https://storage.googleapis.com/tripple-a-gallery.firebasestorage.app/videos/artist%20at%20work%202.mp4" label="Watch" aspectRatio="9/16" />
          <VideoPlayer src="https://storage.googleapis.com/tripple-a-gallery.firebasestorage.app/videos/artist%20at%20work%203.mp4" label="Watch" aspectRatio="9/16" />
        </div>
      </section>

      {/* Profile slideshow */}
      <section className={styles.slideshowSection}>
        <div className={styles.slideshowLabel}>
          <div className="kicker">Artist profile</div>
          <p>Page through Ama&apos;s full profile.</p>
        </div>
        <ProfileSlideshow />
      </section>

      {/* CV */}
      <section className={styles.cv}>
        <h2>Selected exhibitions</h2>
        <dl className={styles.cvList}>
          <div><dt>2024</dt><dd>AAA Exhibition, GUBA Foundation, London · solo</dd></div>
          <div><dt>2024</dt><dd>Cover artist, The Lancet Child &amp; Adolescent Health, February issue</dd></div>
          <div><dt>2023</dt><dd>GUBA Rising Star Award · recipient</dd></div>
        </dl>

        <h2>Recognition</h2>
        <ul className={styles.cvCols}>
          <li>GUBA Rising Star Award, 2023</li>
          <li>The Lancet Cover Artist, February 2024</li>
          <li>Private collections, UK &amp; Ghana</li>
        </ul>
      </section>

      {/* Newsletter CTA */}
      <section className={styles.ctaRow}>
        <div>
          <h3>New works added as they are ready.</h3>
          <p>A short note when new lots are available — no more than a few times a year.</p>
        </div>
        <form className={styles.ctaSub} onSubmit={(e) => e.preventDefault()}>
          <input placeholder="your@email" />
          <button type="submit">Subscribe →</button>
        </form>
      </section>
    </main>
  );
}
