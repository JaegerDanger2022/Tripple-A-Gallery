"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
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
      } catch {
        // The webhook will still mark the order paid — nothing to surface here.
      }
    })();
  }, [sessionId, authLoading, user]);

  return (
    <main className={styles.confirm}>
      <div className={styles.inner}>
        <div className="kicker">
          Order placed · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h1 className={styles.title}>Thank you — your <em>work</em><br />is on its way.</h1>
        <p className={styles.blurb}>
          A receipt is on its way to your inbox. Each piece is packed by hand in the studio and shipped insured. You&apos;ll receive a tracking note as soon as it leaves us.
        </p>
        <dl className={styles.meta}>
          <div><dt>Order</dt><dd>{orderId}</dd></div>
          {total > 0 && <div><dt>Total</dt><dd>£{total.toLocaleString()}</dd></div>}
          <div><dt>Estimated arrival</dt><dd>5–7 working days</dd></div>
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
