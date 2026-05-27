"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { ARTIST } from "@/lib/data";
import styles from "./Header.module.css";

interface Props {
  query: string;
  setQuery: (q: string) => void;
}

export default function Header({ query, setQuery }: Props) {
  const { cartCount, setCartOpen, revealedArtworks } = useApp();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const [first, ...rest] = ARTIST.name.split(" ");
  const last = rest.join(" ");

  const cartVisible = revealedArtworks.size > 0 && cartCount > 0;

  const navLinks = [
    { href: "/", label: "Works" },
    { href: "/?filter=Print", label: "Editions" },
    { href: "/studio", label: "The Artist" },
    { href: "/contact", label: "Contact" },
  ];

  function isOn(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  }

  return (
    <header className={styles.hdr}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandName}><em>{first}</em>{" "}{last}</span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <nav className={styles.nav}>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={isOn(l.href) ? styles.on : ""}>{l.label}</Link>
          ))}
        </nav>

        <div className={styles.right}>
          {/* Desktop search */}
          <div className={styles.search}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {cartVisible && (
            <button className={styles.cartBtn} onClick={() => setCartOpen(true)}>
              Cart <span className={styles.cartCount}>{cartCount}</span>
            </button>
          )}

          {/* Hamburger */}
          <button
            className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <nav className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ""}`}>
        {navLinks.map((l) => (
          <Link key={l.href} href={l.href} className={isOn(l.href) ? styles.on : ""} onClick={() => setMenuOpen(false)}>
            {l.label}
          </Link>
        ))}
        {cartVisible && (
          <button
            onClick={() => { setCartOpen(true); setMenuOpen(false); }}
            style={{ textAlign: "left", padding: "12px 4px", fontSize: 15, color: "var(--ink)", borderBottom: "1px solid var(--line)" }}
          >
            Cart ({cartCount})
          </button>
        )}
        <div className={styles.mobileSearch}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input placeholder="Search works…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </nav>
    </header>
  );
}
