"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./pricing.module.css";

type Interval = "month" | "year";

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

  const currentTier = profile?.tier ?? 0;

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
            Yearly <span className={styles.save}>save</span>
          </button>
        </div>

        {cancelled && <p className={styles.notice}>Checkout cancelled — no charge was made.</p>}
        {err && <p className={styles.error}>{err}</p>}
      </section>

      <section className={styles.tiers}>
        {TIERS.map((t) => {
          const isCurrent = currentTier === t.tier;
          const isDowngrade = t.tier < currentTier;
          return (
            <div key={t.tier} className={`${styles.card} ${t.tier === 1 ? styles.cardFeatured : ""}`}>
              <div className={styles.cardHd}>
                <span className={styles.tierName}>{t.name}</span>
                <span className={styles.tierWorks}>{t.works}</span>
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
