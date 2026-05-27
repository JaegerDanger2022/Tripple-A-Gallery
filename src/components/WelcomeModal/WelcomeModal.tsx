"use client";

import { useEffect, useState, useRef } from "react";
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer";
import styles from "./WelcomeModal.module.css";

const STORAGE_KEY = "aaa_welcome_seen";
const SHOW_AGAIN_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const last = raw ? Number(raw) : 0;
      if (Date.now() - last > SHOW_AGAIN_AFTER_MS) {
        // Slight delay so the page renders first
        const t = setTimeout(() => setOpen(true), 900);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable — skip
    }
  }, []);

  function close() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className={styles.modal}>
        <div className={styles.hd}>
          <div className={styles.kicker}>Tripple A Gallery · Welcome</div>
          <button className={styles.close} onClick={close} aria-label="Close">×</button>
        </div>

        <div className={styles.videoWrap}>
          <VideoPlayer src="/profile/video.mp4" label="Watch the artist at work" />
        </div>

        <div className={styles.ft}>
          <p className={styles.note}>Ama Antwiwaa Amponsah — original works, collage &amp; mixed-media.</p>
          <button className={styles.cta} onClick={close}>Browse works →</button>
        </div>
      </div>
    </div>
  );
}
