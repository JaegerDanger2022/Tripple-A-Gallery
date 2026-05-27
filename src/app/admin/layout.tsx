"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "tripple-a-admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const pathname = usePathname();

  if (!authed) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateBox}>
          <div className="kicker">Admin · Tripple A Gallery</div>
          <h1 className={styles.gateTitle}>Studio access</h1>
          <form
            className={styles.gateForm}
            onSubmit={(e) => {
              e.preventDefault();
              if (pw === ADMIN_PASSWORD) {
                setAuthed(true);
                setErr(false);
              } else {
                setErr(true);
                setPw("");
              }
            }}
          >
            <input
              type="password"
              placeholder="Password"
              value={pw}
              autoFocus
              onChange={(e) => { setPw(e.target.value); setErr(false); }}
              className={err ? styles.inputErr : ""}
            />
            {err && <p className={styles.errMsg}>Incorrect password.</p>}
            <button type="submit" className="primary">Enter →</button>
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
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
