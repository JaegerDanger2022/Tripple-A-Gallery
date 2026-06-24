"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TIER_LABELS } from "@/lib/tier";
import { saveBlobResponse } from "@/lib/download";
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
  // Saved shipping address editor.
  const [editingAddr, setEditingAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({ name: "", address1: "", address2: "", city: "", postal: "", country: "United Kingdom" });
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrErr, setAddrErr] = useState("");
  const [addrMsg, setAddrMsg] = useState("");
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

  // Gated download: send the user's ID token, receive the file bytes (the route
  // re-checks the purchase on every request), then save the blob. The hi-res file
  // is never publicly linked or given a shareable URL.
  async function handleDownload(artworkId: string) {
    if (!user) return;
    setDownloadErr("");
    setDownloading(artworkId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/download?artworkId=${encodeURIComponent(artworkId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDownloadErr(body.error || "Could not start the download.");
        return;
      }
      await saveBlobResponse(res, artworkId);
    } catch {
      setDownloadErr("Could not start the download. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  // ── Saved shipping address ──────────────────────────────────────────────────
  function setAddr(k: keyof typeof addrForm, v: string) {
    setAddrForm((f) => ({ ...f, [k]: v }));
  }
  function startEditAddr() {
    const s = profile?.shipTo;
    setAddrForm({
      name: s?.name ?? "", address1: s?.address1 ?? "", address2: s?.address2 ?? "",
      city: s?.city ?? "", postal: s?.postal ?? "", country: s?.country ?? "United Kingdom",
    });
    setAddrErr(""); setAddrMsg(""); setEditingAddr(true);
  }
  async function saveAddr() {
    if (!user) return;
    if (!addrForm.name || !addrForm.address1 || !addrForm.city || !addrForm.postal) {
      setAddrErr("Please fill in name, address, city and postal code."); return;
    }
    setAddrSaving(true); setAddrErr("");
    try {
      const { setUserShipTo } = await import("@/lib/firestore");
      await setUserShipTo(user.uid, {
        name: addrForm.name, address1: addrForm.address1,
        ...(addrForm.address2 ? { address2: addrForm.address2 } : {}),
        city: addrForm.city, postal: addrForm.postal, country: addrForm.country,
      });
      await refreshProfile();
      setEditingAddr(false); setAddrMsg("Address saved.");
    } catch {
      setAddrErr("Couldn't save — please try again.");
    } finally {
      setAddrSaving(false);
    }
  }
  async function removeAddr() {
    if (!user) return;
    setAddrSaving(true); setAddrErr("");
    try {
      const { removeUserShipTo } = await import("@/lib/firestore");
      await removeUserShipTo(user.uid);
      await refreshProfile();
      setEditingAddr(false); setAddrMsg("Address removed.");
    } catch {
      setAddrErr("Couldn't remove — please try again.");
    } finally {
      setAddrSaving(false);
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
              <span>${totalSpent.toLocaleString()} lifetime</span>
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

      {/* Saved shipping address */}
      <section className={styles.body}>
        <div className={styles.sectionHd}>
          <h2>Shipping address</h2>
          <span className="kicker">Pre-fills your checkout</span>
        </div>

        {addrMsg && <p className={styles.muted}>{addrMsg}</p>}
        {addrErr && <p className={styles.downloadErr}>{addrErr}</p>}

        {!editingAddr ? (
          profile?.shipTo ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                <strong>{profile.shipTo.name}</strong><br />
                {profile.shipTo.address1}{profile.shipTo.address2 ? `, ${profile.shipTo.address2}` : ""}<br />
                {profile.shipTo.city}, {profile.shipTo.postal}<br />
                {profile.shipTo.country}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ghost" onClick={startEditAddr}>Edit</button>
                <button className="ghost" onClick={removeAddr} disabled={addrSaving}>Remove</button>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <p>No saved address yet — add one to speed up checkout.</p>
              <button className="primary" onClick={startEditAddr}>Add address →</button>
            </div>
          )
        ) : (
          <div className="form" style={{ maxWidth: 520 }}>
            <label className="field"><span className="field-lbl">Full name</span>
              <input value={addrForm.name} onChange={(e) => setAddr("name", e.target.value)} /></label>
            <label className="field"><span className="field-lbl">Address line 1</span>
              <input value={addrForm.address1} onChange={(e) => setAddr("address1", e.target.value)} /></label>
            <label className="field"><span className="field-lbl">Address line 2 (optional)</span>
              <input value={addrForm.address2} onChange={(e) => setAddr("address2", e.target.value)} /></label>
            <div className="form-row">
              <label className="field"><span className="field-lbl">City</span>
                <input value={addrForm.city} onChange={(e) => setAddr("city", e.target.value)} /></label>
              <label className="field"><span className="field-lbl">Postal code</span>
                <input value={addrForm.postal} onChange={(e) => setAddr("postal", e.target.value)} /></label>
            </div>
            <label className="field"><span className="field-lbl">Country</span>
              <input value={addrForm.country} onChange={(e) => setAddr("country", e.target.value)} /></label>
            <div className="form-actions">
              <button className="ghost" onClick={() => setEditingAddr(false)} disabled={addrSaving}>Cancel</button>
              <button className="primary" onClick={saveAddr} disabled={addrSaving}>{addrSaving ? "Saving…" : "Save address"}</button>
            </div>
          </div>
        )}
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
                        <span className={styles.linePrice}>${(it.price * it.qty).toLocaleString()}</span>
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
                    {o.shipping > 0 ? `incl. $${o.shipping} shipping` : "digital — no shipping"}
                  </span>
                  <span className={styles.orderTotal}>Total ${o.total.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
