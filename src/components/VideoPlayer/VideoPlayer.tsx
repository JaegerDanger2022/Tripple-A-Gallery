"use client";

import { useRef, useState, useEffect } from "react";
import { Play, X } from "lucide-react";
import styles from "./VideoPlayer.module.css";

interface Props {
  src: string;
  label?: string;
  aspectRatio?: string;
  modal?: boolean;
}

export default function VideoPlayer({ src, label, aspectRatio, modal }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }

  function openModal() {
    setModalOpen(true);
  }

  function closeModal() {
    modalVideoRef.current?.pause();
    setModalOpen(false);
  }

  // Auto-play when modal opens, close on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const v = modalVideoRef.current;
    if (v) v.play().catch(() => {});
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeModal(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // Thumbnail (always shown inline)
  const thumbnail = (
    <div
      className={styles.wrap}
      style={aspectRatio ? { aspectRatio } : undefined}
      onClick={modal ? openModal : undefined}
    >
      {/* Static dark background when modal mode — no inline video needed */}
      {!modal && (
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
      )}
      {(!playing || modal) && (
        <button
          className={styles.play}
          onClick={modal ? openModal : toggle}
          aria-label="Play video"
        >
          <span className={styles.playIcon}><Play size={22} strokeWidth={1.8} fill="currentColor" /></span>
          {label && <span className={styles.playLabel}>{label}</span>}
        </button>
      )}
    </div>
  );

  if (!modal) return thumbnail;

  return (
    <>
      {thumbnail}

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modalBox}>
            <button className={styles.modalClose} onClick={closeModal} aria-label="Close">
              <X size={20} strokeWidth={1.8} />
            </button>
            <video
              ref={modalVideoRef}
              className={styles.modalVideo}
              playsInline
              controls
              onEnded={closeModal}
            >
              <source src={src} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </>
  );
}
