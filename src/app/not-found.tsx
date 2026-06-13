import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      {/* An empty frame, hung slightly crooked, swaying on its nail */}
      <div className={styles.frameWrap} aria-hidden="true">
        <div className={styles.frame}>
          <div className={styles.canvas}>
            <span className={styles.numberMark}>404</span>
            <span className={styles.tag}>No work hung here</span>
          </div>
        </div>
      </div>

      <div className={styles.copy}>
        <div className="kicker">Triple &quot;A&quot; · Lost</div>
        <h1 className={styles.title}>
          This <em>wall</em> is bare.
        </h1>
        <p className={styles.lead}>
          The page you were looking for has been moved, sold, or never hung
          here at all. Let&apos;s walk you back to the gallery.
        </p>

        <div className={styles.actions}>
          <Link href="/" className={styles.cta}>
            Return to the gallery
            <ArrowRight size={16} strokeWidth={1.8} />
          </Link>
          <Link href="/studio" className={styles.ghostCta}>
            <User size={15} strokeWidth={1.8} />
            Meet the artist
          </Link>
        </div>
      </div>
    </main>
  );
}
