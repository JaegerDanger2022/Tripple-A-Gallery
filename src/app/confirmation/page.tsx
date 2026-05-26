"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./confirmation.module.css";

function ConfirmationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "AI-XXXXXX";
  const total = Number(searchParams.get("total") ?? 0);

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
          <div><dt>Total</dt><dd>£{total.toLocaleString()}</dd></div>
          <div><dt>Estimated arrival</dt><dd>5–7 working days</dd></div>
        </dl>
        <div className={styles.actions}>
          <button className="primary" onClick={() => router.push("/")}>Continue browsing →</button>
          <button className="ghost" onClick={() => router.push("/?filter=Print")}>View editions</button>
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
