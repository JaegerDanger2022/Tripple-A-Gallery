"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TIER_LABELS } from "@/lib/tier";
import type { Order } from "@/lib/types";
import styles from "./account.module.css";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountInner />
    </Suspense>
  );
}

function AccountInner() {
  const { user, authLoading, profile, openAuthModal, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadErr, setDownloadErr] = useState("");
  // Billing-portal handoff state.
  const [openingPortal, setOpeningPortal] = useState(false);
  const [billingErr, setBillingErr] = useState("");
  // Upgrade fulfilment status, driven by the ?upgrade=success&session_id=… redirect.
  const [upgradeMsg, setUpgradeMsg] = useState("");
  // Guard: confirm each session exactly once. Without this the effect re-fires
  // when refreshProfile() changes context (new deps), looping the POST and
  // flashing the message before router.replace can clear the query params.
  const confirmedSession = useRef<string | null>(null);

  // After returning from Stripe Checkout, confirm the session server-side (which
  // grants the tier via the Admin SDK), then refresh the local profile.
  useEffect(() => {
    if (authLoading || !user) return;
    if (searchParams.get("upgrade") !== "success") return;
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;
    // Already handled (or in flight) for this session — don't run again.
    if (confirmedSession.current === sessionId) return;
    confirmedSession.current = sessionId;

    // Strip ?upgrade/session_id from the URL up front, synchronously, so a page
    // refresh can never re-trigger confirmation. (router.replace went through
    // the Next router and didn't reliably stick on App Hosting — this does.)
    window.history.replaceState(null, "", "/account");

    let live = true;
    (async () => {
      setUpgradeMsg("Confirming your upgrade…");
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!live) return;
        if (res.ok) {
          // Show success immediately, then refresh the profile so the membership
          // card reflects the new tier. refreshProfile is best-effort (not
          // awaited) so a slow/hanging Firestore client read can't freeze the UI.
          setUpgradeMsg("Upgrade complete — your access has been updated.");
          void refreshProfile();
        } else {
          setUpgradeMsg(body.error || "We couldn't confirm the upgrade. If you were charged, contact the studio.");
        }
      } catch {
        if (live) setUpgradeMsg("We couldn't confirm the upgrade. Please refresh.");
      }
    })();
    return () => { live = false; };
  }, [authLoading, user, searchParams, refreshProfile]);

  // Gated download: exchange the user's ID token for a short-lived signed URL,
  // then hand the browser off to it. The hi-res file is never publicly linked.
  async function handleDownload(artworkId: string) {
    if (!user) return;
    setDownloadErr("");
    setDownloading(artworkId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/download?artworkId=${encodeURIComponent(artworkId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) {
        window.location.href = body.url;
        return;
      }
      setDownloadErr(body.error || "Could not start the download.");
    } catch {
      setDownloadErr("Could not start the download. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  // Open Stripe's hosted Billing Portal, where the user can cancel, switch plan,
  // or update payment. The resulting change comes back as a subscription webhook
  // that re-syncs the tier — we only hand the browser off to Stripe here.
  async function handleManageBilling() {
    if (!user) return;
    setBillingErr("");
    setOpeningPortal(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) {
        window.location.href = body.url;
        return;
      }
      setBillingErr(body.error || "Could not open the billing portal.");
    } catch {
      setBillingErr("Could not open the billing portal. Please try again.");
    } finally {
      setOpeningPortal(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let live = true;
    (async () => {
      setLoading(true);
      try {
        const { getOrdersForUser } = await import("@/lib/firestore");
        const o = await getOrdersForUser(user.uid);
        if (live) setOrders(o);
      } catch {
        if (live) setOrders([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [user, authLoading]);

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <main className={styles.account}>
        <section className={styles.hero}>
          <div className="kicker">Your account</div>
          <h1 className={styles.heroTitle}>Sign in to see <em>your works</em>.</h1>
        </section>
        <div className={styles.signedOut}>
          <p>Your orders, receipts and digital downloads live here once you sign in.</p>
          <div className={styles.signedOutActions}>
            <button className="primary" onClick={() => openAuthModal("signup")}>Create account</button>
            <button className="ghost" onClick={() => openAuthModal("signin")}>Sign in</button>
          </div>
        </div>
      </main>
    );
  }

  const totalSpent = orders.reduce((s, o) => s + o.total, 0);

  return (
    <main className={styles.account}>
      <section className={styles.hero}>
        <div className="kicker">Your account</div>
        <h1 className={styles.heroTitle}>
          Hello, <em>{user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there"}</em>.
        </h1>
        <div className={styles.heroMeta}>
          <span>{user?.email}</span>
          <span className={styles.dot} />
          <span>{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
          {totalSpent > 0 && (
            <>
              <span className={styles.dot} />
              <span>£{totalSpent.toLocaleString()} lifetime</span>
            </>
          )}
          <button className={styles.signOut} onClick={() => signOut()} title="Sign out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </section>

      {/* Membership / tier */}
      <section className={styles.membership}>
        <div>
          <div className="kicker">Membership</div>
          <span className={styles.tierLabel}>{TIER_LABELS[profile?.tier ?? 0]}</span>
          {upgradeMsg && <p className={styles.upgradeMsg}>{upgradeMsg}</p>}
          {billingErr && <p className={styles.billingErr}>{billingErr}</p>}
        </div>
        <div className={styles.membershipActions}>
          {(profile?.tier ?? 0) < 2 && (
            <button className="primary" onClick={() => router.push("/pricing")}>
              {(profile?.tier ?? 0) === 0 ? "Upgrade access →" : "See higher tier →"}
            </button>
          )}
          {/* Only when there's a Stripe subscription to manage (paid via Stripe,
              not an admin-granted tier, which has no customer id). */}
          {profile?.stripeCustomerId && (
            <button className="ghost" onClick={handleManageBilling} disabled={openingPortal}>
              {openingPortal ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.sectionHd}>
          <h2>Purchase activity</h2>
          <span className="kicker">Orders, receipts &amp; downloads</span>
        </div>

        {downloadErr && <p className={styles.downloadErr}>{downloadErr}</p>}

        {loading ? (
          <p className={styles.muted}>Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>
            <p>No orders yet — your purchases will appear here.</p>
            <button className="primary" onClick={() => router.push("/")}>Browse works →</button>
          </div>
        ) : (
          <ul className={styles.orders}>
            {orders.map((o) => (
              <li key={o.id} className={styles.order}>
                <div className={styles.orderHd}>
                  <div>
                    <span className={styles.orderId}>{o.id}</span>
                    <span className={styles.orderDate}>{fmtDate(o.createdAt)}</span>
                  </div>
                  <span className={`${styles.status} ${styles[`status_${o.status}`] ?? ""}`}>{o.status}</span>
                </div>

                <ul className={styles.lines}>
                  {o.items.map((it, i) => (
                    <li key={i} className={styles.line}>
                      <div className={styles.lineInfo}>
                        <span className={styles.lineLot}>Lot {it.lotNumber || "—"}</span>
                        <span className={styles.lineMeta}>
                          {it.variantLabel}
                          {it.frameLabel && it.frameLabel !== "Unframed" && it.frameLabel !== "Digital file"
                            ? ` · ${it.frameLabel}`
                            : ""}
                          {it.qty > 1 ? ` · ×${it.qty}` : ""}
                        </span>
                      </div>
                      <div className={styles.lineRight}>
                        <span className={styles.linePrice}>£{(it.price * it.qty).toLocaleString()}</span>
                        {it.isDigital && (
                          <button
                            className={styles.download}
                            onClick={() => handleDownload(it.artworkId)}
                            disabled={downloading === it.artworkId}
                          >
                            {downloading === it.artworkId ? "Preparing…" : "↓ Download"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className={styles.orderFoot}>
                  <span className={styles.muted}>
                    {o.shipping > 0 ? `incl. £${o.shipping} shipping` : "digital — no shipping"}
                  </span>
                  <span className={styles.orderTotal}>Total £{o.total.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
