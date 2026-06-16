"use client";

import { useState, useEffect, useCallback } from "react";
import { getShippingFee, setShippingFee } from "@/lib/firestore";
import styles from "../admin.module.css";

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{msg}</div>;
}

export default function ShippingAdmin() {
  const [fee, setFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setFee(String(await getShippingFee())); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(fee);
    if (!Number.isFinite(n) || n < 0) { setToast("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await setShippingFee(Math.round(n));
      setFee(String(Math.round(n)));
      setToast("Shipping fee saved");
    } catch {
      setToast("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Shipping</h1>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28, maxWidth: 520, lineHeight: 1.6 }}>
        Flat shipping fee ($) added at checkout for any order with a physical item.
        Digital-only orders are never charged shipping. Set it to <strong>0</strong> for free shipping.
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
            step={1}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
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
