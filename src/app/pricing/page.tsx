"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { PricingResponse } from "@/lib/stripe";
import styles from "./pricing.module.css";

type Interval = "month" | "year";

// Format a Stripe minor-unit amount (e.g. 499 pence) as a localized price.
function fmtAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    // Drop the .00 on whole amounts, keep pence otherwise (£54 vs £53.99).
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

interface PlanTier {
  tier: 0 | 1 | 2;
  name: string;
  works: string;
  blurb: string;
  features: string[];
  paid: boolean;
}

const TIERS: PlanTier[] = [
  {
    tier: 0,
    name: "Viewer",
    works: "5 works",
    blurb: "A rotating personal selection — free, forever.",
    features: ["5 works chosen for you", "Full detail pages", "Buy prints & digital copies"],
    paid: false,
  },
  {
    tier: 1,
    name: "Collector",
    works: "15 works",
    blurb: "Your original five, plus ten more unlocked.",
    features: ["Everything in Viewer", "+10 more works (15 total)", "Early notice on new lots"],
    paid: true,
  },
  {
    tier: 2,
    name: "Patron",
    works: "Full collection",
    blurb: "The entire catalogue, every work, unlocked.",
    features: ["Everything in Collector", "The complete collection", "First access to originals"],
    paid: true,
  },
];

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingInner />
    </Suspense>
  );
}

function PricingInner() {
  const { user, profile, openAuthModal } = useAuth();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("upgrade") === "cancelled";

  const [interval, setInterval] = useState<Interval>("month");
  const [loadingTier, setLoadingTier] = useState<number | null>(null);
  const [err, setErr] = useState("");

  // Live prices from Stripe (display-only). null while loading / if unavailable.
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/stripe/prices");
        const body = await res.json().catch(() => ({}));
        if (live && res.ok && body.pricing) setPricing(body.pricing as PricingResponse);
      } catch {
        // Leave prices hidden — the page still works as a plan comparison.
      }
    })();
    return () => { live = false; };
  }, []);

  const currentTier = profile?.tier ?? 0;

  // The price label for a paid tier at the selected interval, e.g. "£4.99".
  function priceLabel(tier: 0 | 1 | 2): string | null {
    if (tier !== 1 && tier !== 2) return null;
    const p = pricing?.[tier]?.[interval];
    return p ? fmtAmount(p.amount, p.currency) : null;
  }

  // Real yearly saving vs paying monthly for 12 months, as a rounded %.
  // Returns null unless both prices are known and yearly is actually cheaper.
  function yearlySavingPct(): number | null {
    if (!pricing) return null;
    let best = 0;
    for (const tier of [1, 2] as const) {
      const m = pricing[tier]?.month;
      const y = pricing[tier]?.year;
      if (!m || !y || m.currency !== y.currency) continue;
      const monthlyAnnual = m.amount * 12;
      if (monthlyAnnual <= y.amount) continue;
      const pct = Math.round(((monthlyAnnual - y.amount) / monthlyAnnual) * 100);
      if (pct > best) best = pct;
    }
    return best > 0 ? best : null;
  }
  const savePct = yearlySavingPct();

  async function startCheckout(tier: 1 | 2) {
    setErr("");
    if (!user) { openAuthModal("signin"); return; }
    setLoadingTier(tier);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier, interval }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) {
        window.location.href = body.url; // off to Stripe Checkout
        return;
      }
      setErr(body.error || "Could not start checkout. Please try again.");
    } catch {
      setErr("Could not start checkout. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <main className={styles.pricing}>
      <section className={styles.hero}>
        <div className="kicker">Membership</div>
        <h1 className={styles.heroTitle}>
          Unlock <em>more of the collection</em>.
        </h1>
        <p className={styles.heroSub}>
          Every member gets their own selection. Upgrade to widen it — or open the whole catalogue.
        </p>

        <div className={styles.toggle}>
          <button
            className={interval === "month" ? styles.toggleOn : ""}
            onClick={() => setInterval("month")}
          >
            Monthly
          </button>
          <button
            className={interval === "year" ? styles.toggleOn : ""}
            onClick={() => setInterval("year")}
          >
            Yearly{" "}
            <span className={styles.save}>{savePct ? `save ${savePct}%` : "save"}</span>
          </button>
        </div>

        {cancelled && <p className={styles.notice}>Checkout cancelled — no charge was made.</p>}
        {err && <p className={styles.error}>{err}</p>}
      </section>

      <section className={styles.tiers}>
        {TIERS.map((t) => {
          const isCurrent = currentTier === t.tier;
          const isDowngrade = t.tier < currentTier;
          const price = priceLabel(t.tier);
          return (
            <div key={t.tier} className={`${styles.card} ${t.tier === 1 ? styles.cardFeatured : ""}`}>
              <div className={styles.cardHd}>
                <span className={styles.tierName}>{t.name}</span>
                <span className={styles.tierWorks}>{t.works}</span>
              </div>

              <div className={styles.priceRow}>
                {!t.paid ? (
                  <span className={styles.priceAmount}>Free</span>
                ) : price ? (
                  <>
                    <span className={styles.priceAmount}>{price}</span>
                    <span className={styles.pricePer}>/{interval === "month" ? "mo" : "yr"}</span>
                  </>
                ) : (
                  <span className={styles.pricePending}>—</span>
                )}
              </div>

              <p className={styles.cardBlurb}>{t.blurb}</p>

              <ul className={styles.featureList}>
                {t.features.map((f, i) => (
                  <li key={i}><Check size={15} strokeWidth={2} /> {f}</li>
                ))}
              </ul>

              <div className={styles.cardCta}>
                {isCurrent ? (
                  <span className={styles.currentBadge}>
                    <Check size={15} strokeWidth={2} /> Your plan
                  </span>
                ) : !t.paid ? (
                  <span className={styles.freeBadge}>Free</span>
                ) : isDowngrade ? (
                  <span className={styles.muted}>Included below your plan</span>
                ) : (
                  <button
                    className={styles.upgradeBtn}
                    onClick={() => startCheckout(t.tier as 1 | 2)}
                    disabled={loadingTier === t.tier}
                  >
                    {loadingTier === t.tier ? "Starting…" : (
                      <>{user ? "Upgrade" : <><Lock size={14} strokeWidth={2} /> Sign in to upgrade</>}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <p className={styles.foot}>
        Billed securely via Stripe. Cancel anytime — your access reverts to your free selection.
      </p>
    </main>
  );
}
