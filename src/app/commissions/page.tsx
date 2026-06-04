import styles from "./commissions.module.css";

export const metadata = { title: "Commissions — Triple A Gallery" };

export default function CommissionsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="kicker">Service · bespoke work</div>
        <h1 className={styles.heroTitle}>Commissions</h1>
      </section>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2>Working directly with the artist</h2>
          <p>Ama takes a small number of commissions each year. A commission is a conversation — the work that emerges is still wholly hers, shaped by her process and vision, but informed by your space, your story, or a subject that matters to you.</p>
        </div>

        <div className={styles.section}>
          <h2>What a commission looks like</h2>
          <p>Most commissions begin with a brief exchange — what the work is for, the scale, any colours or themes that feel important. Ama then works from that starting point in her own way. You will see progress at agreed stages and have the opportunity to respond before the work is completed.</p>
          <p>Commissions are available in mixed media, collage, and painting. Scale can range from intimate works on paper to large-format canvases.</p>
        </div>

        <div className={styles.section}>
          <h2>Timelines &amp; pricing</h2>
          <p>Commissions typically take between six and twelve weeks from agreement to delivery, depending on scale and complexity. Pricing is discussed individually and reflects scale, materials, and the nature of the work. A deposit of 50% is required to confirm a commission, with the balance due before shipping.</p>
        </div>

        <div className={styles.section}>
          <h2>Gifting</h2>
          <p>Commissioned works make considered, lasting gifts. The studio can arrange presentation packaging, a handwritten note from the artist, and discreet gifting logistics if needed.</p>
        </div>

        <div className={styles.cta}>
          <p>To begin a conversation about a commission:</p>
          <a href="/contact" className={styles.ctaLink}>Contact the studio →</a>
        </div>
      </div>
    </main>
  );
}
