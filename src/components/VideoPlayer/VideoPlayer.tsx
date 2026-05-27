"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import styles from "./VideoPlayer.module.css";

interface Props {
  src: string;
  label?: string;
  aspectRatio?: string;
}

export default function VideoPlayer({ src, label, aspectRatio }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }

  return (
    <div className={styles.wrap} style={aspectRatio ? { aspectRatio } : undefined}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        preload="none"
        onEnded={() => setPlaying(false)}
        onClick={toggle}
      >
        <source src={src} type="video/mp4" />
      </video>
      {!playing && (
        <button className={styles.play} onClick={toggle} aria-label="Play video">
          <span className={styles.playIcon}><Play size={22} strokeWidth={1.8} fill="currentColor" /></span>
          {label && <span className={styles.playLabel}>{label}</span>}
        </button>
      )}
    </div>
  );
}
