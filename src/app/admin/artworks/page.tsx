"use client";

import { useState, useEffect, useCallback } from "react";
import type { Artwork, Category } from "@/lib/types";
import { getArtworks, createArtwork, updateArtwork, deleteArtwork, getCategories, seedFirestore } from "@/lib/firestore";
import styles from "../admin.module.css";

// ── Blank artwork for "add" mode ─────────────────────────────────────────────
const BLANK: Omit<Artwork, "id"> = {
  lotNumber: "",
  title: "",
  year: new Date().getFullYear(),
  medium: "",
  dimensions: "",
  edition: "Original work, 1 of 1",
  price: 0,
  category: "",
  color: "#ccbbaa",
  accent: "#555544",
  series: "",
  blurb: "",
  imageUrl: "",
  order: 0,
};

// ── Toast helper ─────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{msg}</div>;
}

// ── Artwork form drawer ───────────────────────────────────────────────────────
interface DrawerProps {
  initial: Omit<Artwork, "id"> & { id?: string };
  categories: Category[];
  onSave: (data: Omit<Artwork, "id">, id?: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function ArtworkDrawer({ initial, categories, onSave, onClose, saving }: DrawerProps) {
  const [form, setForm] = useState(initial);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { id, ...data } = form as typeof form & { id?: string };
    await onSave(data, id);
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>
            {(form as typeof form & { id?: string }).id ? "Edit artwork" : "Add artwork"}
          </h2>
          <button className={styles.drawerClose} onClick={onClose}>×</button>
        </div>

        <form className={styles.drawerBody} onSubmit={handleSubmit} id="artwork-form">
          {/* Lot number */}
          <div className={styles.fldRow}>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Lot number</label>
              <input className={styles.fldInput} required value={form.lotNumber} onChange={(e) => set("lotNumber", e.target.value)} placeholder="e.g. AAA1, TA4" style={{ fontFamily: "var(--f-mono)" }} />
            </div>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Title <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></label>
              <input className={styles.fldInput} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Leave blank — viewer names it" />
            </div>
          </div>

          {/* Category & Series */}
          <div className={styles.fldRow}>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Category</label>
              <select className={styles.fldSelect} value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Series <span style={{ fontWeight: 400, opacity: 0.5 }}>(optional)</span></label>
              <input className={styles.fldInput} value={form.series ?? ""} onChange={(e) => set("series", e.target.value)} placeholder="e.g. AAA series" />
            </div>
          </div>

          {/* Year & Price */}
          <div className={styles.fldRow}>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Year</label>
              <input className={styles.fldInput} type="number" value={form.year ?? ""} onChange={(e) => set("year", Number(e.target.value))} placeholder="e.g. 2024" />
            </div>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Price (£)</label>
              <input className={styles.fldInput} type="number" required min={0} value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
            </div>
          </div>

          {/* Medium & Dimensions */}
          <div className={styles.fld}>
            <label className={styles.fldLbl}>Medium</label>
            <input className={styles.fldInput} value={form.medium ?? ""} onChange={(e) => set("medium", e.target.value)} placeholder="e.g. Mixed media, collage" />
          </div>
          <div className={styles.fldRow}>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Dimensions</label>
              <input className={styles.fldInput} value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="e.g. 120 × 90 cm" />
            </div>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Edition</label>
              <input className={styles.fldInput} value={form.edition} onChange={(e) => set("edition", e.target.value)} placeholder="e.g. Edition of 12" />
            </div>
          </div>

          {/* Description */}
          <div className={styles.fld}>
            <label className={styles.fldLbl}>Description (blurb)</label>
            <textarea className={styles.fldTextarea} rows={4} value={form.blurb ?? ""} onChange={(e) => set("blurb", e.target.value)} placeholder="Optional — viewer names the work." />
          </div>

          {/* Image URL */}
          <div className={styles.fld}>
            <label className={styles.fldLbl}>Image URL</label>
            <input className={styles.fldInput} type="url" value={form.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
          </div>

          {/* Colour swatches */}
          <div className={styles.fldRow}>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Placeholder colour</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} style={{ width: 40, height: 32, padding: 2, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }} />
                <input className={styles.fldInput} value={form.color} onChange={(e) => set("color", e.target.value)} style={{ fontFamily: "var(--f-mono)", fontSize: 12 }} />
              </div>
            </div>
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Accent colour</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={form.accent} onChange={(e) => set("accent", e.target.value)} style={{ width: 40, height: 32, padding: 2, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }} />
                <input className={styles.fldInput} value={form.accent} onChange={(e) => set("accent", e.target.value)} style={{ fontFamily: "var(--f-mono)", fontSize: 12 }} />
              </div>
            </div>
          </div>

          {/* Sort order */}
          <div className={styles.fld}>
            <label className={styles.fldLbl}>Display order</label>
            <input className={styles.fldInput} type="number" min={0} value={form.order ?? 0} onChange={(e) => set("order", Number(e.target.value))} />
          </div>
        </form>

        <div className={styles.drawerFooter}>
          <button type="submit" form="artwork-form" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save artwork"}
          </button>
          <button className="ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ArtworksAdmin() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerData, setDrawerData] = useState<(Omit<Artwork, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [seeded, setSeeded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [arts, cats] = await Promise.all([getArtworks(), getCategories()]);
      setArtworks(arts);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSeed() {
    await seedFirestore();
    setSeeded(true);
    await load();
    setToast("Firestore seeded with sample data");
  }

  function openAdd() {
    setDrawerData({ ...BLANK, order: artworks.length });
  }

  function openEdit(a: Artwork) {
    setDrawerData(a);
  }

  async function handleSave(data: Omit<Artwork, "id">, id?: string) {
    setSaving(true);
    try {
      if (id) {
        await updateArtwork(id, data);
        setToast("Artwork updated");
      } else {
        await createArtwork(data);
        setToast("Artwork added");
      }
      setDrawerData(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await deleteArtwork(id);
    setToast("Artwork deleted");
    await load();
  }

  return (
    <>
      {/* Seed banner — shown when Firestore appears empty */}
      {!loading && artworks.length <= 10 && !seeded && (
        <div className={styles.seedBanner}>
          <span>Firestore may be empty. Seed it with the 10 sample artworks to get started.</span>
          <button onClick={handleSeed}>Seed Firestore</button>
        </div>
      )}

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Artworks</h1>
        <button className="primary" onClick={openAdd}>+ Add artwork</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 13 }}>Loading…</p>
      ) : artworks.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No artworks yet. Add one above.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Title</th>
                <th>Category</th>
                <th>Year</th>
                <th>Price</th>
                <th>Edition</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {artworks.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 11 }}>{a.order ?? i}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        className={styles.swatch}
                        style={{ background: a.color }}
                      />
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 13 }}>Lot {a.lotNumber}</span>
                      {a.title && <span style={{ fontFamily: "var(--f-display)", fontSize: 13, color: "var(--muted)" }}><em>{a.title}</em></span>}
                    </div>
                  </td>
                  <td><span className={styles.badge}>{a.category}</span></td>
                  <td style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--muted)" }}>{a.year}</td>
                  <td style={{ fontFamily: "var(--f-mono)", fontSize: 13 }}>£{a.price.toLocaleString()}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{a.edition}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => openEdit(a)}>Edit</button>
                      <button className={styles.btnDelete} onClick={() => handleDelete(a.id, a.lotNumber)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerData && (
        <ArtworkDrawer
          initial={drawerData}
          categories={categories}
          onSave={handleSave}
          onClose={() => setDrawerData(null)}
          saving={saving}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </>
  );
}
