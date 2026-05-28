"use client";

import type { Artwork } from "@/lib/types";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import styles from "./ArtworkCard.module.css";

interface Props {
  artwork: Artwork;
  idx: number;
  onOpen: () => void;
}

export default function ArtworkCard({ artwork: a, idx: _idx, onOpen }: Props) {
  return (
    <article className={styles.card} onClick={onOpen}>
      <ArtPlaceholder artwork={a} />
      <div className={styles.meta}>
        <div className={styles.top}>
          <span className={styles.title}>Lot {a.lotNumber}</span>
          {a.year && <span className={styles.year}>{a.year}</span>}
        </div>
        <div className={styles.bottom}>
          {a.medium && <span className={styles.medium}>{a.medium}</span>}
          {a.category && <span className={styles.series}>{a.category}</span>}
        </div>
      </div>
    </article>
  );
}
