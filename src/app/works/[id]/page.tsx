"use client";

import { use, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ARTIST, getVariants } from "@/lib/data";
import { useApp } from "@/context/AppContext";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import ArtworkCard from "@/components/ArtworkCard/ArtworkCard";
import type { Artwork } from "@/lib/types";
import styles from "./detail.module.css";

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { artworks } = useApp();
  const a = artworks.find((x) => x.id === id);

  if (!a) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--f-display)" }}>Work not found</h1>
        <button onClick={() => router.push("/")} style={{ marginTop: 24 }}>← Back to works</button>
      </div>
    );
  }

  return <DetailInner artwork={a} />;
}

function DetailInner({ artwork: a }: { artwork: Artwork }) {
  const router = useRouter();
  const { addToCart, revealArtwork, revealedArtworks, artworks, frames } = useApp();
  const [variant, setVariant] = useState("print");
  const [frameId, setFrameId] = useState<string>("none");
  const [added, setAdded] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  // Pricing / cart is only shown after "Get a copy" is clicked
  const revealed = revealedArtworks.has(a.id);

  const variants = getVariants(a);
  const v = variants.find((x) => x.id === variant) ?? variants[0];

  // Build frame list: always have "Unframed" first, then Firestore frames with price > 0
  const frameOpts = frames.length > 0
    ? frames
    : [
        { id: "none", name: "Unframed", color: "#e8e4dc", price: 0,   order: 0 },
        { id: "oak",  name: "Oak",      color: "#c9a87c", price: 120,  order: 1 },
        { id: "black",name: "Black ash",color: "#2a2a2a", price: 140,  order: 2 },
      ];
  const selectedFrame = frameOpts.find((f) => f.id === frameId) ?? frameOpts[0];
  const total = v.price + (selectedFrame?.price ?? 0);

  const related = artworks
    .filter((x) => x.id !== a.id && ((a.series && x.series === a.series) || x.category === a.category))
    .slice(0, 3);

  function reveal() {
    revealArtwork(a.id);
    setTimeout(() => buyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  function onAdd() {
    addToCart({
      id: `${a.id}-${variant}-${frameId}`,
      artworkId: a.id,
      variantId: variant,
      variantLabel: v.label,
      frameId,
      frameLabel: selectedFrame?.name ?? "Unframed",
      price: total,
      qty: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className={styles.detail}>
      <nav className={styles.crumbs}>
        <a onClick={() => router.push("/")}>Works</a>
        <span>/</span>
        {a.category && <><a onClick={() => router.push(`/?filter=${encodeURIComponent(a.category)}`)}>{a.category}</a><span>/</span></>}
        <span className={styles.current}>Lot {a.lotNumber}</span>
      </nav>

      <div className={styles.grid}>
        <div className={styles.imgCol}>
          <ArtPlaceholder artwork={a} ratio="portrait" />
          <div className={styles.thumbs}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${styles.thumb} ${i === 0 ? styles.thumbOn : ""}`}>
                <ArtPlaceholder artwork={a} ratio="square" showLabel={false} />
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.info}>
          <div className="kicker">{[a.category, a.year, a.series].filter(Boolean).join(" · ")}</div>
          <h1 className={styles.title}>Lot <em>{a.lotNumber}</em></h1>
          {a.blurb && <p className={styles.blurb}>{a.blurb}</p>}

          <dl className={styles.specs}>
            {a.medium && <div><dt>Medium</dt><dd>{a.medium}</dd></div>}
            {a.dimensions && <div><dt>Dimensions</dt><dd>{a.dimensions}</dd></div>}
            {a.edition && <div><dt>Edition</dt><dd>{a.edition}</dd></div>}
            <div><dt>Signed</dt><dd>Yes, verso</dd></div>
            <div><dt>Ships from</dt><dd>{ARTIST.based}</dd></div>
          </dl>

          {/* Pricing reveal — cart button only appears after this is clicked */}
          <div ref={buyRef} className={`${styles.buyShell} ${revealed ? styles.buyShellOn : ""}`}>
            {!revealed ? (
              <button className={styles.reveal} onClick={reveal}>
                <span className={styles.revealLbl}>Get a copy</span>
                <span className={styles.revealSub}>Prints, editions and originals — reveal pricing</span>
                <span className={styles.revealArrow}>→</span>
              </button>
            ) : (
              <div className={styles.buy}>
                <div className={styles.buyHead}>
                  <div className="kicker">Pricing &amp; formats</div>
                  <button className={styles.buyCollapse} onClick={() => {/* keep revealed, just scroll */}}>
                    Pricing
                  </button>
                </div>

                <div className={styles.buyRow}>
                  <label className={styles.buyLbl}>Format</label>
                  <div className={styles.variants}>
                    {variants.map((vv) => (
                      <button
                        key={vv.id}
                        className={`${styles.v} ${vv.id === variant ? styles.vOn : ""}`}
                        onClick={() => setVariant(vv.id)}
                      >
                        <span className={styles.vLabel}>{vv.label}</span>
                        <span className={styles.vSub}>{vv.sub}</span>
                        <span className={styles.vPrice}>£{vv.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.buyRow}>
                  <label className={styles.buyLbl}>Framing</label>
                  <div className={styles.frameOpts}>
                    {frameOpts.map((f) => (
                      <button
                        key={f.id}
                        className={`${styles.f} ${f.id === frameId ? styles.fOn : ""}`}
                        onClick={() => setFrameId(f.id)}
                      >
                        <span className={`${styles.fsw} ${f.price === 0 ? styles.fswUnframed : ""}`} style={f.price > 0 ? { background: f.color } : undefined} />
                        <span>{f.name}</span>
                        {f.price
                          ? <span className={styles.fPrice}>+£{f.price}</span>
                          : <span className={`${styles.fPrice} ${styles.fPriceFree}`}>—</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.buyTotal}>
                  <div>
                    <span className={styles.buyTotalLbl}>Total</span>
                    <span className={styles.buyTotalVal}>£{total.toLocaleString()}</span>
                  </div>
                  <span className={styles.buyTotalNote}>incl. archival packing · shipping calc&apos;d at checkout</span>
                </div>

                <button className={`${styles.buyCta} ${added ? styles.buyCtaAdded : ""}`} onClick={onAdd}>
                  {added ? "Added to cart ✓" : "Add to cart"}
                </button>
              </div>
            )}
          </div>

          <ul className={styles.assurances}>
            <li>Authenticity certificate, signed by the artist</li>
            <li>Packed by the studio · insured worldwide shipping</li>
            <li>14-day return window on prints and editions</li>
          </ul>
        </aside>
      </div>

      <section className={styles.related}>
        <div className={styles.relatedHd}>
          <h2>Adjacent works</h2>
          <span className="kicker">From the same series, or the same hand</span>
        </div>
        <div className={styles.relatedGrid}>
          {related.map((r, i) => (
            <ArtworkCard key={r.id} artwork={r} idx={i} onOpen={() => router.push(`/works/${r.id}`)} />
          ))}
        </div>
      </section>
    </div>
  );
}
