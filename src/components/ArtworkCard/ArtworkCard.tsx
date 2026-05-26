"use client";

import type { Artwork } from "@/lib/types";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import styles from "./ArtworkCard.module.css";

const RATIOS = ["portrait", "portrait", "landscape", "portrait", "square", "portrait", "landscape", "portrait", "square", "portrait"] as const;

interface Props {
  artwork: Artwork;
  idx: number;
  onOpen: () => void;
}

export default function ArtworkCard({ artwork: a, idx, onOpen }: Props) {
  const ratio = RATIOS[idx % RATIOS.length];
  return (
    <article className={styles.card} onClick={onOpen}>
      <ArtPlaceholder artwork={a} ratio={ratio} />
      <div className={styles.meta}>
        <div className={styles.top}>
          <span className={styles.title}><em>{a.title}</em></span>
          <span className={styles.year}>{a.year}</span>
        </div>
        <div className={styles.bottom}>
          <span className={styles.medium}>{a.medium}</span>
          <span className={styles.series}>{a.series}</span>
        </div>
      </div>
    </article>
  );
}
