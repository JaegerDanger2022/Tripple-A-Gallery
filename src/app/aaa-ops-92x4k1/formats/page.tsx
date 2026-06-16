"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FormatOption } from "@/lib/types";
import {
  getFormats,
  createFormat,
  updateFormat,
  deleteFormat,
  reorderFormats,
} from "@/lib/firestore";
import styles from "../admin.module.css";

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{msg}</div>;
}

const BLANK: Omit<FormatOption, "id" | "order"> = {
  name: "",
  description: "",
  priceMode: "fixed",
  fixedPrice: 0,
  percentBase: 0.15,
  percentAdd: 140,
  enabled: true,
};

// ── Format drawer ─────────────────────────────────────────────────────────────
function FormatDrawer({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: Partial<FormatOption> & { id?: string };
  onSave: (data: Omit<FormatOption, "id" | "order">, id?: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Omit<FormatOption, "id" | "order">>({
    name: initial.name ?? "",
    description: initial.description ?? "",
    priceMode: initial.priceMode ?? "fixed",
    fixedPrice: initial.fixedPrice ?? 0,
    percentBase: initial.percentBase ?? 0.15,
    percentAdd: initial.percentAdd ?? 140,
    enabled: initial.enabled ?? true,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form, initial.id);
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>{initial.id ? "Edit format" : "Add format"}</h2>
          <button className={styles.drawerClose} onClick={onClose}>×</button>
        </div>

        <form className={styles.drawerBody} onSubmit={handleSubmit} id="format-form">
          <div className={styles.fld}>
            <label className={styles.fldLbl}>Name</label>
            <input
              className={styles.fldInput}
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Print, small · Canvas · Original"
              autoFocus
            />
          </div>

          <div className={styles.fld}>
            <label className={styles.fldLbl}>Description</label>
            <input
              className={styles.fldInput}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. A4 · open edition · giclée on Hahnemühle"
            />
          </div>

          <div className={styles.fld}>
            <label className={styles.fldLbl}>Pricing mode</label>
            <select
              className={styles.fldSelect}
              value={form.priceMode}
              onChange={(e) => set("priceMode", e.target.value as "fixed" | "percent")}
            >
              <option value="fixed">Fixed price</option>
              <option value="percent">Formula: % of artwork price + flat amount</option>
            </select>
          </div>

          {form.priceMode === "fixed" ? (
            <div className={styles.fld}>
              <label className={styles.fldLbl}>Price ($)</label>
              <input
                className={styles.fldInput}
                type="number"
                min={0}
                required
                value={form.fixedPrice}
                onChange={(e) => set("fixedPrice", Number(e.target.value))}
              />
            </div>
          ) : (
            <div className={styles.fldRow}>
              <div className={styles.fld}>
                <label className={styles.fldLbl}>% of artwork price</label>
                <input
                  className={styles.fldInput}
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  required
                  value={form.percentBase}
                  onChange={(e) => set("percentBase", Number(e.target.value))}
                  placeholder="e.g. 0.15 = 15%"
                />
              </div>
              <div className={styles.fld}>
                <label className={styles.fldLbl}>+ flat amount ($)</label>
                <input
                  className={styles.fldInput}
                  type="number"
                  min={0}
                  required
                  value={form.percentAdd}
                  onChange={(e) => set("percentAdd", Number(e.target.value))}
                  placeholder="e.g. 140"
                />
              </div>
            </div>
          )}

          <div className={styles.fld}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span className={styles.fldLbl} style={{ marginBottom: 0 }}>Enabled (shown to buyers)</span>
            </label>
          </div>

          {form.priceMode === "percent" && (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              Price = round(artwork&nbsp;price × {form.percentBase} + {form.percentAdd})
            </p>
          )}
        </form>

        <div className={styles.drawerFooter}>
          <button type="submit" form="format-form" className="primary" disabled={saving}>
            {saving ? "Saving…" : "Save format"}
          </button>
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FormatsAdmin() {
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerData, setDrawerData] = useState<(Partial<FormatOption> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragSourceIndex = useRef<number>(-1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFormats(await getFormats()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setDrawerData({ ...BLANK }); }
  function openEdit(f: FormatOption) { setDrawerData(f); }

  async function handleSave(data: Omit<FormatOption, "id" | "order">, id?: string) {
    setSaving(true);
    try {
      if (id) {
        await updateFormat(id, data);
        setToast("Format saved");
      } else {
        await createFormat({ ...data, order: formats.length });
        setToast("Format added");
      }
      setDrawerData(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete format "${name}"?`)) return;
    await deleteFormat(id);
    setToast("Format deleted");
    await load();
  }

  async function toggleEnabled(f: FormatOption) {
    await updateFormat(f.id, { enabled: !f.enabled });
    setToast(f.enabled ? "Format disabled" : "Format enabled");
    await load();
  }

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, id: string, index: number) {
    setDragging(id); dragSourceIndex.current = index; e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(id);
  }
  async function handleDrop(e: React.DragEvent, targetId: string, targetIndex: number) {
    e.preventDefault();
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return; }
    const reordered = [...formats];
    const [moved] = reordered.splice(dragSourceIndex.current, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((f, i) => ({ ...f, order: i }));
    setFormats(withOrder);
    setDragging(null); setDragOver(null);
    await reorderFormats(withOrder.map((f) => ({ id: f.id, order: f.order })));
    setToast("Order saved");
  }
  function handleDragEnd() { setDragging(null); setDragOver(null); }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Formats</h1>
        <button className="primary" onClick={openAdd}>+ Add format</button>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28, maxWidth: 560 }}>
        Format options shown to buyers (e.g. Print, Original, Canvas). When none are added here, the site
        falls back to built-in defaults. Drag to reorder. Disable to temporarily hide without deleting.
      </p>

      {loading ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 13 }}>Loading…</p>
      ) : formats.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No formats yet — using built-in defaults. Add one above to take over.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th style={{ width: 40 }}>#</th>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {formats.map((f, i) => (
                <tr
                  key={f.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, f.id, i)}
                  onDragOver={(e) => handleDragOver(e, f.id)}
                  onDrop={(e) => handleDrop(e, f.id, i)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragging === f.id ? 0.4 : f.enabled ? 1 : 0.5,
                    background: dragOver === f.id && dragging !== f.id
                      ? "color-mix(in oklab, var(--ink) 5%, transparent)"
                      : undefined,
                    transition: "background 0.1s",
                  }}
                >
                  <td><span className={styles.dragHandle} title="Drag to reorder">⠿</span></td>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 11 }}>{i}</td>
                  <td style={{ fontFamily: "var(--f-display)", fontSize: 15 }}>{f.name}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 200 }}>{f.description}</td>
                  <td style={{ fontFamily: "var(--f-mono)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {f.priceMode === "fixed"
                      ? `$${f.fixedPrice}`
                      : `${(f.percentBase * 100).toFixed(0)}% + $${f.percentAdd}`}
                  </td>
                  <td>
                    <span className={styles.badge} style={f.enabled ? { background: "color-mix(in oklab, green 12%, transparent)", color: "green" } : {}}>
                      {f.enabled ? "On" : "Off"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => openEdit(f)}>Edit</button>
                      <button className={styles.btnEdit} onClick={() => toggleEnabled(f)} style={{ color: f.enabled ? "var(--muted)" : "var(--ink)" }}>
                        {f.enabled ? "Disable" : "Enable"}
                      </button>
                      <button className={styles.btnDelete} onClick={() => handleDelete(f.id, f.name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerData && (
        <FormatDrawer
          initial={drawerData}
          onSave={handleSave}
          onClose={() => setDrawerData(null)}
          saving={saving}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </>
  );
}
