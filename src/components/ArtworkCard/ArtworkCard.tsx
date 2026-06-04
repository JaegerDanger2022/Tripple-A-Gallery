"use client";

import { Lock } from "lucide-react";
import type { Artwork } from "@/lib/types";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import styles from "./ArtworkCard.module.css";

interface Props {
  artwork: Artwork;
  idx: number;
  onOpen: () => void;
  /** Reports the rendered image's natural dimensions once loaded. */
  onRatio?: (w: number, h: number) => void;
  /** CSS aspect-ratio for the image cell, so every card in a row matches. */
  cellRatio?: string;
  /** When true, the image is blurred behind a lock overlay and `onOpen` is suppressed. */
  locked?: boolean;
  /** Short prompt shown on the lock overlay, e.g. "Sign in to view" or "Upgrade to view". */
  lockLabel?: string;
  /** Called when a locked card is clicked, instead of onOpen. */
  onLockedClick?: () => void;
}

export default function ArtworkCard({
  artwork: a,
  idx: _idx,
  onOpen,
  onRatio,
  cellRatio,
  locked = false,
  lockLabel = "Upgrade to view",
  onLockedClick,
}: Props) {
  return (
    <article
      className={`${styles.card} ${locked ? styles.cardLocked : ""}`}
      onClick={locked ? onLockedClick : onOpen}
    >
      <div className={styles.imgWrap}>
        <div className={locked ? styles.lockedImg : undefined}>
          <ArtPlaceholder
            artwork={a}
            onRatio={onRatio}
            cellRatio={cellRatio}
            showLabel={!locked}
          />
        </div>
        {locked && (
          <div className={styles.lockOverlay}>
            <span className={styles.lockBadge}>
              <Lock size={16} strokeWidth={1.8} />
            </span>
            <span className={styles.lockLabel}>{lockLabel}</span>
          </div>
        )}
      </div>
      <div className={styles.meta}>
        <div className={styles.top}>
          <span className={styles.title}>Lot {locked ? "—" : a.lotNumber}</span>
          {!locked && a.year && <span className={styles.year}>{a.year}</span>}
        </div>
        <div className={styles.bottom}>
          {locked ? (
            <span className={styles.medium}>Locked</span>
          ) : (
            <>
              {a.medium && <span className={styles.medium}>{a.medium}</span>}
              {a.category && <span className={styles.series}>{a.category}</span>}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
