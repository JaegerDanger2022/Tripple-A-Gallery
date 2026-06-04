import styles from "./framing.module.css";

export const metadata = { title: "Framing — Triple A Gallery" };

export default function FramingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="kicker">Service · presentation</div>
        <h1 className={styles.heroTitle}><em>Framing</em></h1>
      </section>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2>Studio framing</h2>
          <p>We offer optional framing at the point of purchase for all prints and editions. Frames are selected and fitted by the studio before dispatch — the work arrives ready to hang.</p>
        </div>

        <div className={styles.section}>
          <h2>Frame options</h2>
          <p>Current frame options are shown on each individual work page when you reveal pricing. Options typically include:</p>
          <ul>
            <li><strong>Oak</strong> — warm natural oak with a thin profile, suited to warmer and earthier works</li>
            <li><strong>Black ash</strong> — deep matte black, suited to high-contrast or cooler-toned pieces</li>
          </ul>
          <p>All frames are fitted with UV-protective glazing and archival-grade mount board. Works are dry-mounted or float-mounted depending on the format.</p>
        </div>

        <div className={styles.section}>
          <h2>Custom framing</h2>
          <p>If you have a specific framing requirement — a bespoke size, a particular moulding, or a preference for conservation glazing — contact the studio. We can arrange custom framing through our supplier before shipping, or advise on framing locally.</p>
        </div>

        <div className={styles.section}>
          <h2>Originals</h2>
          <p>Original works are generally sold unframed unless agreed otherwise. The studio is happy to discuss framing options prior to purchase.</p>
        </div>

        <div className={styles.cta}>
          <p>Want to discuss a custom framing option?</p>
          <a href="/contact" className={styles.ctaLink}>Contact the studio →</a>
        </div>
      </div>
    </main>
  );
}
