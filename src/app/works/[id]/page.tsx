"use client";

import { use, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { ARTIST } from "@/lib/data";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { isUnlocked } from "@/lib/tier";
import { buildVariants, frameOptions } from "@/lib/pricing";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import ArtworkCard from "@/components/ArtworkCard/ArtworkCard";
import type { Artwork } from "@/lib/types";
import styles from "./detail.module.css";

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = decodeURIComponent(rawId);
  const router = useRouter();
  const { artworks, dataLoading } = useApp();
  const { user, profile, profileLoading, openAuthModal } = useAuth();
  const a = artworks.find((x) => x.id === id);

  if ((dataLoading || profileLoading) && !a) {
    return <div style={{ padding: "80px 40px", textAlign: "center", color: "var(--muted)" }}>Loading…</div>;
  }

  if (!a) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--f-display)" }}>Work not found</h1>
        <button onClick={() => router.push("/")} style={{ marginTop: 24 }}>← Back to works</button>
      </div>
    );
  }

  // Tier gate — block direct-URL access to works the user hasn't unlocked.
  // Wait for the profile to settle so we don't flash the locked screen.
  if (!profileLoading && !isUnlocked(profile, a.id, artworks.map((x) => x.id))) {
    return (
      <div className={styles.lockedGate}>
        <span className={styles.lockedGateBadge}>
          <Lock size={22} strokeWidth={1.7} />
        </span>
        <h1 className={styles.lockedGateTitle}>This work is locked</h1>
        <p className={styles.lockedGateText}>
          {user
            ? "Your current tier doesn't include this piece. Upgrade your access to view it in full."
            : "Sign in to see the works in your collection, or upgrade your tier for the full catalogue."}
        </p>
        <div className={styles.lockedGateActions}>
          {user ? (
            <button className={styles.lockedGateCta} onClick={() => router.push("/pricing")}>
              Upgrade access
            </button>
          ) : (
            <button className={styles.lockedGateCta} onClick={() => openAuthModal("signin")}>
              Sign in
            </button>
          )}
          <button className={styles.lockedGateBack} onClick={() => router.push("/")}>
            ← Back to works
          </button>
        </div>
      </div>
    );
  }

  return <DetailInner artwork={a} />;
}

function DetailInner({ artwork: a }: { artwork: Artwork }) {
  const router = useRouter();
  const { addToCart, revealArtwork, revealedArtworks, artworks, frames, formats, digitalPrice } = useApp();
  const [variantId, setVariantId] = useState<string>("");
  const [frameId, setFrameId] = useState<string>("none");
  const [added, setAdded] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  // Pricing / cart is only shown after "Get a copy" is clicked
  const revealed = revealedArtworks.has(a.id);

  // Build the variant + frame lists from the shared pricing module, so what's
  // shown here matches exactly what the checkout API recomputes and charges.
  // (Digital download is included when the work has a private hi-res file.)
  const variants = buildVariants(a, formats, digitalPrice);
  const v = variants.find((x) => x.id === variantId) ?? variants[0];

  const frameOpts = frameOptions(frames);
  const selectedFrame = frameOpts.find((f) => f.id === frameId) ?? frameOpts[0];
  // Digital downloads have no physical frame; price is just the file.
  const total = v.isDigital ? v.price : v.price + (selectedFrame?.price ?? 0);

  const related = artworks
    .filter((x) => x.id !== a.id && ((a.series && x.series === a.series) || x.category === a.category))
    .slice(0, 3);

  function reveal() {
    revealArtwork(a.id);
    setTimeout(() => buyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  function onAdd() {
    const digital = v?.isDigital;
    addToCart({
      id: `${a.id}-${v?.id ?? ""}-${digital ? "digital" : frameId}`,
      artworkId: a.id,
      variantId: v?.id ?? "",
      variantLabel: v?.label ?? "",
      frameId: digital ? "none" : frameId,
      frameLabel: digital ? "Digital file" : (selectedFrame?.name ?? "Unframed"),
      price: total,
      qty: 1,
      isDigital: digital,
      lotNumber: a.lotNumber,
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
                        className={`${styles.v} ${vv.id === (v?.id ?? "") ? styles.vOn : ""}`}
                        onClick={() => setVariantId(vv.id)}
                      >
                        <span className={styles.vLabel}>{vv.label}</span>
                        <span className={styles.vSub}>{vv.sub}</span>
                        {vv.isOriginal ? (
                          a.soldOut ? (
                            <span className={styles.vSold}>Sold</span>
                          ) : (
                            <span className={styles.vContact}>Contact for price</span>
                          )
                        ) : (
                          <span className={styles.vPrice}>${vv.price.toLocaleString()}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {!v?.isDigital && (
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
                          ? <span className={styles.fPrice}>+${f.price}</span>
                          : <span className={`${styles.fPrice} ${styles.fPriceFree}`}>—</span>}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                <div className={styles.buyTotal}>
                  <div>
                    <span className={styles.buyTotalLbl}>Total</span>
                    {v?.isOriginal ? (
                      <span className={styles.buyTotalVal}>{a.soldOut ? "Sold" : "Contact for price"}</span>
                    ) : (
                      <span className={styles.buyTotalVal}>${total.toLocaleString()}</span>
                    )}
                  </div>
                  <span className={styles.buyTotalNote}>
                    {v?.isOriginal
                      ? (a.soldOut
                          ? "This original is sold · prints & editions still available"
                          : "Originals are sold by enquiry · prints & editions available below")
                      : v?.isDigital
                        ? "High-res digital file · emailed after checkout · personal use only"
                        : "incl. archival packing · shipping calc'd at checkout"}
                  </span>
                </div>

                {v?.isOriginal ? (
                  a.soldOut ? (
                    <p className={styles.buySoldNote}>
                      The original is sold — choose a print or edition above to add to cart.
                    </p>
                  ) : (
                    <button
                      className={styles.buyCta}
                      onClick={() => router.push(`/contact?lot=${encodeURIComponent(a.lotNumber)}`)}
                    >
                      Contact us about this original
                    </button>
                  )
                ) : (
                  <button className={`${styles.buyCta} ${added ? styles.buyCtaAdded : ""}`} onClick={onAdd}>
                    {added ? "Added to cart ✓" : "Add to cart"}
                  </button>
                )}
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
            <ArtworkCard key={r.id} artwork={r} idx={i} onOpen={() => router.push(`/works/${encodeURIComponent(r.id)}`)} />
          ))}
        </div>
      </section>
    </div>
  );
}
