"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "./admin.module.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
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

  if (user === "loading") return null;

  if (!user) {
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
