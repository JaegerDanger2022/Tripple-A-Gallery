"use client";

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

  const [first, last] = ARTIST.name.split(" ");

  // Cart button only shown once user has clicked "Get a copy" on at least one artwork
  const cartVisible = revealedArtworks.size > 0 && cartCount > 0;

  return (
    <header className={styles.hdr}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandName}><em>{first}</em> {last}</span>
        </Link>

        <nav className={styles.nav}>
          <Link href="/" className={pathname === "/" ? styles.on : ""}>Works</Link>
          <Link href="/?filter=Print">Editions</Link>
          <Link href="/studio" className={pathname === "/studio" ? styles.on : ""}>Studio</Link>
          <Link href="/contact" className={pathname === "/contact" ? styles.on : ""}>Contact</Link>
        </nav>

        <div className={styles.right}>
          <div className={styles.search}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder="Search works…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {cartVisible && (
            <button className={styles.cartBtn} onClick={() => setCartOpen(true)}>
              Cart <span className={styles.cartCount}>{cartCount}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
