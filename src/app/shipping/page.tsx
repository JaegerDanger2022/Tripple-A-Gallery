import styles from "./shipping.module.css";

export const metadata = { title: "Shipping & Returns — Triple A Gallery" };

export default function ShippingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className="kicker">Service · logistics</div>
        <h1 className={styles.heroTitle}>Shipping <em>&amp; returns</em></h1>
      </section>

      <div className={styles.body}>
        <div className={styles.section}>
          <h2>Packaging</h2>
          <p>Every work leaves the studio packed by hand. Originals are wrapped in acid-free tissue, sandwiched between archival board, and sealed inside a rigid double-walled box. Prints are rolled in glassine and shipped in reinforced tubes or flat-packed in stiffened mailers depending on size.</p>
        </div>

        <div className={styles.section}>
          <h2>Shipping</h2>
          <p>We ship worldwide via tracked, insured courier. A flat shipping contribution is added at checkout for orders containing a physical work — the exact amount is shown before you pay. Digital downloads are delivered by email at no shipping cost. For orders outside the United Kingdom, import duties and local taxes may apply — these are the buyer&apos;s responsibility. Delivery typically takes:</p>
          <ul>
            <li><strong>United Kingdom</strong> — 2–4 business days</li>
            <li><strong>Europe</strong> — 5–8 business days</li>
            <li><strong>Rest of world</strong> — 7–14 business days</li>
          </ul>
          <p>A tracking number is emailed as soon as your order ships.</p>
        </div>

        <div className={styles.section}>
          <h2>Returns</h2>
          <p>Prints and editions may be returned within <strong>14 days</strong> of delivery, provided they are returned in original condition and original packaging. To initiate a return, contact us at <a href="mailto:info@tripleagallery.com">info@tripleagallery.com</a> with your order reference. Return shipping is at the buyer&apos;s expense.</p>
          <p>Original works are final sale. If a work arrives damaged in transit, please photograph the packaging and the work within 24 hours of receipt and contact us immediately — all shipments are fully insured.</p>
        </div>

        <div className={styles.section}>
          <h2>Certificate of authenticity</h2>
          <p>Every work — print, edition, or original — ships with a signed certificate of authenticity issued by the studio. Originals include a studio label on the verso.</p>
        </div>

        <div className={styles.cta}>
          <p>Questions about a specific order or shipment?</p>
          <a href="/contact" className={styles.ctaLink}>Contact the studio →</a>
        </div>
      </div>
    </main>
  );
}
