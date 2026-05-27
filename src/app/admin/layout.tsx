"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import styles from "./admin.module.css";

type State = "loading" | "unauthenticated" | "checking" | "authorised" | "denied";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u: User | null) => {
      if (!u) { setState("unauthenticated"); return; }
      setState("checking");
      const snap = await getDoc(doc(db, "admins", u.uid));
      setState(snap.exists() ? "authorised" : "denied");
    });
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setErr("Incorrect email or password.");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading" || state === "checking") return null;

  if (state === "denied") {
    return (
      <div className={styles.gate}>
        <div className={styles.gateBox}>
          <div className="kicker">Admin · Tripple A Gallery</div>
          <h1 className={styles.gateTitle}>Not authorised</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
            Your account doesn't have admin access.
          </p>
          <button
            className="primary"
            onClick={() => signOut(auth)}
            style={{ marginTop: 8 }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <div className={styles.gate}>
        <div className={styles.gateBox}>
          <div className="kicker">Admin · Tripple A Gallery</div>
          <h1 className={styles.gateTitle}>Studio access</h1>
          <form className={styles.gateForm} onSubmit={handleSignIn}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoFocus
              required
              onChange={(e) => { setEmail(e.target.value); setErr(""); }}
              className={err ? styles.inputErr : ""}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              required
              onChange={(e) => { setPassword(e.target.value); setErr(""); }}
              className={err ? styles.inputErr : ""}
            />
            {err && <p className={styles.errMsg}>{err}</p>}
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className="kicker">Admin</div>
          <span className={styles.sidebarTitle}>Tripple A Gallery</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin/artworks" className={pathname.startsWith("/admin/artworks") ? styles.active : ""}>
            <span className={styles.navIcon}>◻</span> Artworks
          </Link>
          <Link href="/admin/categories" className={pathname.startsWith("/admin/categories") ? styles.active : ""}>
            <span className={styles.navIcon}>◈</span> Categories
          </Link>
          <Link href="/admin/frames" className={pathname.startsWith("/admin/frames") ? styles.active : ""}>
            <span className={styles.navIcon}>⬚</span> Frames
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backLink}>← Back to gallery</Link>
          <button
            onClick={() => signOut(auth)}
            style={{ marginTop: 12, fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
