"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ARTIST } from "@/lib/data";
import ArtworkCard from "@/components/ArtworkCard/ArtworkCard";
import type { Sort } from "@/lib/types";
import styles from "./browse.module.css";

export default function BrowsePage() {
  const { tweaks, artworks, categories } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get("filter") ?? "All";
  const [filter, setFilter] = useState(filterParam);
  const [sort, setSort] = useState<Sort>("curated");
  const [query, setQuery] = useState("");

  // Sync filter when URL changes
  useEffect(() => {
    setFilter(searchParams.get("filter") ?? "All");
  }, [searchParams]);

  // All categories including "All"
  const allFilters = useMemo(
    () => ["All", ...categories.map((c) => c.name)],
    [categories]
  );

  const series = useMemo(() => [...new Set(artworks.map((a) => a.series))], [artworks]);

  const filtered = useMemo(() => {
    let list = artworks.slice();
    if (filter !== "All") list = list.filter((a) => a.category === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.lotNumber.toLowerCase().includes(q) ||
          (a.title ?? "").toLowerCase().includes(q) ||
          (a.medium ?? "").toLowerCase().includes(q) ||
          (a.series ?? "").toLowerCase().includes(q)
      );
    }
    if (sort === "recent") list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    else if (sort === "series") list.sort((a, b) => (a.series ?? "").localeCompare(b.series ?? ""));
    else list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return list;
  }, [artworks, filter, query, sort]);

  function handleFilter(c: string) {
    setFilter(c);
    router.replace(c === "All" ? "/" : `/?filter=${encodeURIComponent(c)}`);
  }

  return (
    <div className={styles.browse}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroMeta}>
          <div className="kicker">Tripple A Gallery</div>
          <div className={styles.heroDates}>Ama Antwiwaa Amponsah</div>
        </div>
        <h1 className={styles.heroTitle}>
          Portraits, collage &amp; <em>mixed-media works</em>,<br />
          layered with colour, texture, and feeling.
        </h1>
        <div className={styles.heroFoot}>
          <span>{artworks.length} works</span>
          <span className={styles.dot} />
          <span>{series.length} series</span>
          <span className={styles.dot} />
          <span>{ARTIST.based}</span>
        </div>
      </section>

      {/* Filter rail */}
      <section className={styles.rail}>
        <div className={styles.railCats}>
          {allFilters.map((c) => (
            <button
              key={c}
              className={c === filter ? styles.on : ""}
              onClick={() => handleFilter(c)}
            >
              {c}
              <span className={styles.railNum}>
                {c === "All" ? artworks.length : artworks.filter((a) => a.category === c).length}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.railSort}>
          <label>Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="curated">Curated</option>
            <option value="recent">Most recent</option>
            <option value="series">By series</option>
          </select>
        </div>
      </section>

      {/* Grid */}
      <section className={`${styles.grid} ${styles[`grid-${tweaks.density}` as keyof typeof styles]}`}>
        {filtered.map((a, i) => (
          <ArtworkCard
            key={a.id}
            artwork={a}
            idx={i}
            onOpen={() => router.push(`/works/${a.id}`)}
          />
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <p>No works match that.</p>
            <button onClick={() => handleFilter("All")}>Clear filter</button>
          </div>
        )}
      </section>
    </div>
  );
}
