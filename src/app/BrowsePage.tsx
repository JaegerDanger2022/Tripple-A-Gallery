"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ARTIST } from "@/lib/data";
import { unlockedIds } from "@/lib/tier";
import ArtworkCard from "@/components/ArtworkCard/ArtworkCard";
import type { Sort, Density, Artwork } from "@/lib/types";
import styles from "./browse.module.css";

// Aspect-ratio class derived from an image's natural dimensions.
type AspectClass = "square" | "portrait" | "landscape";

// How many cards fit on one row, per density setting.
const PER_ROW: Record<Density, number> = { compact: 4, regular: 3, spacious: 2 };

function classifyRatio(w: number, h: number): AspectClass {
  if (!w || !h) return "portrait";
  const r = w / h;
  if (r > 1.15) return "landscape";
  if (r < 0.87) return "portrait";
  return "square";
}

// Order aspect classes appear in: squares, then portraits, then landscapes.
const CLASS_ORDER: Record<AspectClass, number> = { square: 0, portrait: 1, landscape: 2 };

// CSS aspect-ratio each class renders its cards at, so every card in a row is
// the exact same size (images fill the cell with object-fit: cover).
const CLASS_AR: Record<AspectClass, string> = {
  square: "1 / 1",
  portrait: "3 / 4",
  landscape: "4 / 3",
};

interface Row {
  cls: AspectClass;
  items: Artwork[];
}

// Group artworks into rows where every row holds only one aspect-ratio class.
// The list is first reordered so all works of the same class sit together
// (stable within each class, so the incoming sort order is preserved), then
// packed into rows capped at `perRow`. This pulls same-ratio works onto shared
// rows even when they are far apart in the original order.
//
// `unlocked` (when provided) is the primary sort key: accessible works fill the
// top rows and locked works follow below, so tier 0/1 users see what they can
// view first. Aspect class is the secondary key, original order the tertiary.
function groupRows(
  list: Artwork[],
  ratios: Record<string, AspectClass>,
  perRow: number,
  unlocked?: Set<string>
): Row[] {
  const classOf = (a: Artwork): AspectClass => ratios[a.id] ?? "portrait";
  // 0 = unlocked (sorts first), 1 = locked. When no set is given (e.g. tier 2 /
  // everything unlocked) every work scores 0, leaving the order unchanged.
  const lockRank = (a: Artwork): number => (unlocked && !unlocked.has(a.id) ? 1 : 0);

  // Stable sort: unlocked-first, then aspect class, then incoming order.
  const ordered = list
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const l = lockRank(x.a) - lockRank(y.a);
      if (l !== 0) return l;
      const d = CLASS_ORDER[classOf(x.a)] - CLASS_ORDER[classOf(y.a)];
      return d !== 0 ? d : x.i - y.i;
    })
    .map((e) => e.a);

  const rows: Row[] = [];
  let current: Artwork[] = [];
  let currentClass: AspectClass | null = null;
  let currentLock: number | null = null;

  for (const a of ordered) {
    const cls = classOf(a);
    const lock = lockRank(a);
    const full = current.length >= perRow;
    // A row also breaks at the unlocked→locked boundary so a single row never
    // mixes accessible and blurred works.
    if (current.length === 0) {
      current.push(a);
      currentClass = cls;
      currentLock = lock;
    } else if (cls === currentClass && lock === currentLock && !full) {
      current.push(a);
    } else {
      rows.push({ cls: currentClass!, items: current });
      current = [a];
      currentClass = cls;
      currentLock = lock;
    }
  }
  if (current.length) rows.push({ cls: currentClass!, items: current });
  return rows;
}

export default function BrowsePage() {
  const { tweaks, artworks, categories } = useApp();
  const { user, profile, openAuthModal } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Which works the current user can view. Signed-out / no profile → none.
  const allIds = useMemo(() => artworks.map((a) => a.id), [artworks]);
  const unlocked = useMemo(() => unlockedIds(profile, allIds), [profile, allIds]);
  const unlockedCount = profile?.tier === 2 ? artworks.length : unlocked.size;

  // Locked-card click: prompt sign-in if signed out, otherwise nudge to upgrade.
  const handleLocked = useCallback(() => {
    if (!user) openAuthModal("signin");
    else router.push("/pricing");
  }, [user, openAuthModal, router]);
  const lockLabel = user ? "Upgrade to view" : "Sign in to view";

  const filterParam = searchParams.get("filter") ?? "All";
  const [filter, setFilter] = useState(filterParam);
  const [sort, setSort] = useState<Sort>("curated");
  const [query, setQuery] = useState("");

  // Aspect-ratio class per artwork id, measured from each image's natural
  // dimensions as it loads. Drives row grouping below.
  const [ratios, setRatios] = useState<Record<string, AspectClass>>({});
  const reportRatio = useCallback((id: string, w: number, h: number) => {
    const cls = classifyRatio(w, h);
    setRatios((prev) => (prev[id] === cls ? prev : { ...prev, [id]: cls }));
  }, []);

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

  // Build rows: consecutive artworks of the same aspect class, capped at the
  // density's per-row count. Mixed classes never share a row. For tier 0/1,
  // unlocked works are floated to the top rows (no effect for tier 2 / signed-out,
  // where every work shares the same lock state).
  const rows = useMemo(
    () => groupRows(filtered, ratios, PER_ROW[tweaks.density], unlocked),
    [filtered, ratios, tweaks.density, unlocked]
  );

  function handleFilter(c: string) {
    setFilter(c);
    router.replace(c === "All" ? "/" : `/?filter=${encodeURIComponent(c)}`);
  }

  return (
    <div className={styles.browse}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroMeta}>
          <div className="kicker">Triple A Gallery</div>
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
          {unlockedCount < artworks.length && (
            <>
              <span className={styles.dot} />
              <span>{unlockedCount} of {artworks.length} unlocked</span>
            </>
          )}
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

      {/* Grid — rows grouped by aspect ratio (square / portrait / landscape) */}
      <section className={styles.rows}>
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={styles.row}
            style={{ "--per-row": PER_ROW[tweaks.density] } as React.CSSProperties}
          >
            {row.items.map((a, i) => (
              <ArtworkCard
                key={a.id}
                artwork={a}
                idx={i}
                cellRatio={CLASS_AR[row.cls]}
                locked={!unlocked.has(a.id)}
                lockLabel={lockLabel}
                onLockedClick={handleLocked}
                onRatio={(w, h) => reportRatio(a.id, w, h)}
                onOpen={() => router.push(`/works/${encodeURIComponent(a.id)}`)}
              />
            ))}
          </div>
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
