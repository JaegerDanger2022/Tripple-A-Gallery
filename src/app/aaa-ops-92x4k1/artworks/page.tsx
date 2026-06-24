"use client";

import { useState, useEffect, useCallback } from "react";
import type { Artwork, Category } from "@/lib/types";
import { getArtworks, createArtwork, updateArtwork, deleteArtwork, getCategories, seedFirestore, uploadHiResImage } from "@/lib/firestore";
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
  soldOut: false,
  category: "",
  color: "#ccbbaa",
  accent: "#555544",
  series: "",
  blurb: "",
  imageUrl: "",
  hiResPath: "",
  digitalEnabled: true,
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
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleHiResUpload(file: File) {
    setUploadErr("");
    setUploading(true);
    try {
      // Namespace by the artwork id when editing, else by lot number for new works.
      const key = (form as typeof form & { id?: string }).id || form.lotNumber || "new";
      const path = await uploadHiResImage(key, file);
      set("hiResPath", path);
    } catch {
      setUploadErr("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
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
              <label className={styles.fldLbl}>Price ($)</label>
              <input className={styles.fldInput} type="number" required min={0} value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
            </div>
          </div>

          {/* Sold-out toggle for the original */}
          <div className={styles.fld}>
            <label className={styles.fldLbl}>Original (1 of 1)</label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.soldOut ?? false}
                onChange={(e) => set("soldOut", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span>Mark original as <strong>Sold</strong></span>
            </label>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0" }}>
              When off, the original shows “Contact for price”. Prints &amp; editions are always sold online.
            </p>
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

          {/* Hi-def image for digital downloads */}
          <div className={styles.fld}>
            <label className={styles.fldLbl}>
              Hi-def image <span style={{ fontWeight: 400, opacity: 0.5 }}>(for digital downloads)</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label
                className="ghost"
                style={{ cursor: uploading ? "default" : "pointer", display: "inline-flex", alignItems: "center", padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13 }}
              >
                {uploading ? "Uploading…" : (form.hiResPath ? "Replace file" : "Upload file")}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleHiResUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {form.hiResPath && !uploading && (
                <>
                  <span style={{ fontSize: 12, color: "var(--ink)", fontFamily: "var(--f-mono)" }}>
                    ✓ uploaded
                  </span>
                  <button type="button" onClick={() => set("hiResPath", "")} style={{ fontSize: 12, color: "var(--muted)" }}>
                    Remove
                  </button>
                </>
              )}
            </div>
            {uploadErr && <p style={{ fontSize: 12, color: "var(--accent)", margin: "6px 0 0" }}>{uploadErr}</p>}
            {form.hiResPath && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <span style={{ fontSize: 13 }}>
                  Digital download:{" "}
                  <strong style={{ color: form.digitalEnabled !== false ? "var(--ink)" : "var(--muted)" }}>
                    {form.digitalEnabled !== false ? "On sale" : "Off"}
                  </strong>
                </span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => set("digitalEnabled", form.digitalEnabled === false)}
                  style={{ fontSize: 12, padding: "6px 12px", border: "1px solid var(--line)", borderRadius: 4 }}
                >
                  {form.digitalEnabled !== false ? "Disable" : "Enable"}
                </button>
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
              Full-resolution file buyers receive when they purchase the digital download. Stored privately in Firebase Storage — released only to verified buyers via a secure link.
              {form.hiResPath && " Use Disable to stop selling the download without removing the file."}
            </p>
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
                  <td style={{ fontFamily: "var(--f-mono)", fontSize: 13 }}>
                    ${a.price.toLocaleString()}
                    {a.soldOut && (
                      <span style={{ marginLeft: 8, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c0392b", background: "#fff", border: "1px solid #c0392b", borderRadius: 999, padding: "2px 7px" }}>
                        Sold
                      </span>
                    )}
                  </td>
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
