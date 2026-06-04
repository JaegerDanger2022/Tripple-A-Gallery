"use client";

import { useState, useEffect, useCallback } from "react";
import type { Tier, UserProfile } from "@/lib/types";
import { TIER_LABELS } from "@/lib/tier";
import { listUsers, setUserTier } from "@/lib/firestore";
import styles from "../admin.module.css";

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{msg}</div>;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await listUsers()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeTier(u: UserProfile, tier: Tier) {
    if (tier === u.tier) return;
    setSavingId(u.uid);
    try {
      await setUserTier(u.uid, tier);
      setUsers((list) => list.map((x) => (x.uid === u.uid ? { ...x, tier } : x)));
      setToast(`${u.email || u.uid} → ${TIER_LABELS[tier]}`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Users</h1>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28, maxWidth: 620 }}>
        Each user is assigned a random set of works on first sign-in. Tier 0 sees 5, tier 1 sees 15,
        tier 2 sees the full collection. Set the tier manually here until subscriptions drive it
        automatically. Profiles appear once a user has signed in at least once.
      </p>

      {loading ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 13 }}>Loading…</p>
      ) : users.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No users yet — nobody has signed in.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th style={{ width: 70 }}>Works</th>
                <th style={{ width: 220 }}>Tier</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                // Works the user can currently see (tier 2 = full catalogue, not stored here).
                const assigned =
                  u.tier >= 2
                    ? "all"
                    : u.tier >= 1
                      ? u.tier0Works.length + u.tier1Works.length
                      : u.tier0Works.length;
                return (
                  <tr key={u.uid} style={{ opacity: savingId === u.uid ? 0.5 : 1 }}>
                    <td style={{ fontSize: 13 }}>{u.email || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)" }}>
                      {new Date(u.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}>{assigned}</td>
                    <td>
                      <select
                        className={styles.fldSelect}
                        value={u.tier}
                        disabled={savingId === u.uid}
                        onChange={(e) => changeTier(u, Number(e.target.value) as Tier)}
                        style={{ maxWidth: 210 }}
                      >
                        <option value={0}>{TIER_LABELS[0]}</option>
                        <option value={1}>{TIER_LABELS[1]}</option>
                        <option value={2}>{TIER_LABELS[2]}</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </>
  );
}
