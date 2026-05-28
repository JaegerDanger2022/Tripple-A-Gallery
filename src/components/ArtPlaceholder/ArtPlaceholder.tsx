"use client";

import { useState } from "react";
import type { Artwork } from "@/lib/types";
import styles from "./ArtPlaceholder.module.css";

interface Props {
  artwork: Artwork;
  ratio?: "portrait" | "landscape" | "square"; // kept for fallback placeholder only
  showLabel?: boolean;
  style?: React.CSSProperties;
}

export default function ArtPlaceholder({ artwork: a, ratio = "portrait", showLabel = true, style }: Props) {
  const [imgError, setImgError] = useState(false);

  if (a.imageUrl && !imgError) {
    return (
      <div className={styles.ph} style={{ background: a.color, ...style }}>
        <img
          src={a.imageUrl}
          alt={`Lot ${a.lotNumber}`}
          className={styles.img}
          onError={() => setImgError(true)}
        />
        {showLabel && (
          <div className={styles.lotBadge}>Lot {a.lotNumber}</div>
        )}
      </div>
    );
  }

  // Colour placeholder fallback — use ratio for sizing when no image
  const ar = ratio === "landscape" ? "4 / 3" : ratio === "square" ? "1 / 1" : "3 / 4";
  const stripeId = `s-${a.id}-${ratio}`;
  return (
    <div className={styles.ph} style={{ aspectRatio: ar, background: a.color, ...style }}>
      <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id={stripeId} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2.4" height="2.4" fill={a.color} />
            <line x1="0" y1="0" x2="0" y2="2.4" stroke={a.accent} strokeWidth="0.5" strokeOpacity="0.18" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#${stripeId})`} />
      </svg>
      {showLabel && (
        <div className={styles.label} style={{ color: a.accent }}>
          <span>Lot {a.lotNumber}</span>
        </div>
      )}
    </div>
  );
}
