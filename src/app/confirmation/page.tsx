"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { saveBlobResponse } from "@/lib/download";
import type { OrderItem } from "@/lib/types";
import styles from "./confirmation.module.css";

function ConfirmationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useApp();
  const { user, authLoading } = useAuth();
  const orderId = searchParams.get("orderId") ?? "AI-XXXXXX";
  const sessionId = searchParams.get("session_id");
  // Total comes from the legacy ?total= param or, after Stripe, from confirmation.
  const [total, setTotal] = useState<number>(Number(searchParams.get("total") ?? 0));
  // Order items — returned by order-confirm so we can show downloads + the right
  // wording (digital vs physical). Empty until the confirm call resolves.
  const [items, setItems] = useState<OrderItem[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadErr, setDownloadErr] = useState("");
  // Confirm each session once (the effect re-runs as auth/context settle).
  const confirmed = useRef<string | null>(null);

  // The cart was paid for — empty it once we land here.
  useEffect(() => { clearCart(); }, [clearCart]);

  // Returned from Stripe Checkout: confirm the session server-side so the order
  // flips to "paid" immediately (the webhook is the backup). Best-effort — the
  // thank-you page shows regardless.
  useEffect(() => {
    if (!sessionId || authLoading || !user) return;
    if (confirmed.current === sessionId) return;
    confirmed.current = sessionId;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/stripe/order-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && typeof body.total === "number") setTotal(body.total);
        if (res.ok && Array.isArray(body.items)) setItems(body.items as OrderItem[]);
      } catch {
        // The webhook will still mark the order paid — nothing to surface here.
      }
    })();
  }, [sessionId, authLoading, user]);

  // Gated download: same flow as the account page — send the ID token, receive
  // the file bytes (re-authorized server-side per request), then save the blob.
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

  const digitalItems = items.filter((it) => it.isDigital);
  const hasPhysical = items.some((it) => !it.isDigital);
  const digitalOnly = items.length > 0 && digitalItems.length > 0 && !hasPhysical;

  // Wording adapts to what was bought. Until items load we use neutral copy so a
  // digital buyer never briefly sees "shipped insured".
  const title = digitalOnly
    ? <>Thank you — your <em>download</em><br />is ready.</>
    : hasPhysical
      ? <>Thank you — your <em>work</em><br />is on its way.</>
      : <>Thank you — your <em>order</em><br />is confirmed.</>;
  const blurb = digitalOnly
    ? "A receipt is on its way to your inbox. Your high-resolution file is ready below — and it's always available under Your account → Purchase activity."
    : hasPhysical
      ? <>A receipt is on its way to your inbox. Each piece is packed by hand in the studio and shipped insured. You&apos;ll receive a tracking note as soon as it leaves us.{digitalItems.length > 0 ? " Your digital file is ready to download below." : ""}</>
      : "A receipt is on its way to your inbox.";

  return (
    <main className={styles.confirm}>
      <div className={styles.inner}>
        <div className="kicker">
          Order placed · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.blurb}>{blurb}</p>

        {digitalItems.length > 0 && (
          <div className={styles.downloads}>
            <div className={styles.downloadsHd}>Your downloads</div>
            <div className={styles.dlRow}>
              {digitalItems.map((it) => (
                <button
                  key={it.artworkId}
                  className="primary"
                  onClick={() => handleDownload(it.artworkId)}
                  disabled={downloading === it.artworkId}
                >
                  {downloading === it.artworkId ? "Preparing…" : `↓ Download Lot ${it.lotNumber || "—"}`}
                </button>
              ))}
            </div>
            {downloadErr && <p className={styles.downloadErr}>{downloadErr}</p>}
          </div>
        )}

        <dl className={styles.meta}>
          <div><dt>Order</dt><dd>{orderId}</dd></div>
          {total > 0 && <div><dt>Total</dt><dd>${total.toLocaleString()}</dd></div>}
          {hasPhysical
            ? <div><dt>Estimated arrival</dt><dd>5–7 working days</dd></div>
            : digitalOnly
              ? <div><dt>Delivery</dt><dd>Instant download</dd></div>
              : null}
        </dl>
        <div className={styles.actions}>
          <button className="primary" onClick={() => router.push("/")}>Continue browsing →</button>
          <button className="ghost" onClick={() => router.push("/account")}>View your orders</button>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80 }}>Loading…</div>}>
      <ConfirmationInner />
    </Suspense>
  );
}
