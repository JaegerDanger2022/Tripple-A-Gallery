import styles from "./press.module.css";

export const metadata = { title: "Press — Tripple A Gallery" };

export default function PressPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="kicker">Press · media</div>
        <h1 className={styles.heroTitle}>Press</h1>
      </section>

      <div className={styles.body}>
        <p className={styles.coming}>Press materials and coverage coming soon. For press enquiries, contact the studio directly.</p>
        <a href="/contact" className={styles.ctaLink}>Contact the studio →</a>
      </div>
    </main>
  );
}
