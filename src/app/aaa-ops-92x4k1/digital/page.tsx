"use client";

import { useState, useEffect, useCallback } from "react";
import { getDigitalPrice, setDigitalPrice } from "@/lib/firestore";
import styles from "../admin.module.css";

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{msg}</div>;
}

export default function DigitalAdmin() {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setPrice(String(await getDigitalPrice())); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) { setToast("Enter a valid amount"); return; }
    // Round to whole cents so the displayed price and the Stripe charge agree.
    const cents = Math.round(n * 100) / 100;
    setSaving(true);
    try {
      await setDigitalPrice(cents);
      setPrice(String(cents));
      setToast("Digital price saved");
    } catch {
      setToast("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Digital downloads</h1>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28, maxWidth: 520, lineHeight: 1.6 }}>
        Flat price ($) for the digital download of any work that has a hi-res file.
        Decimals allowed (e.g. <strong>0.99</strong>). Stripe enforces a minimum charge
        of about $0.50. To enable or disable the download on a specific work, use the
        toggle in that artwork&apos;s editor.
      </p>

      {loading ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 13 }}>Loading…</p>
      ) : (
        <form onSubmit={handleSave} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 14, color: "var(--muted)" }}>$</span>
          <input
            className={styles.fldInput}
            type="number"
            min={0}
            step={0.01}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ maxWidth: 140, padding: "8px 12px" }}
            autoFocus
          />
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </>
  );
}
