"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FrameOption } from "@/lib/types";
import {
  getFrames,
  createFrame,
  updateFrame,
  deleteFrame,
  reorderFrames,
} from "@/lib/firestore";
import styles from "../admin.module.css";

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{msg}</div>;
}

// ── Inline edit row ───────────────────────────────────────────────────────────
function EditRow({
  frame,
  onSave,
  onCancel,
}: {
  frame: FrameOption;
  onSave: (data: Partial<Omit<FrameOption, "id">>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(frame.name);
  const [color, setColor] = useState(frame.color);
  const [price, setPrice] = useState(String(frame.price));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ name: name.trim(), color, price: Number(price) });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        ref={inputRef}
        className={styles.fldInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        style={{ maxWidth: 180, padding: "6px 10px", fontSize: 13 }}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        required
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 36, height: 32, padding: 2, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}
        />
        <input
          className={styles.fldInput}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="#rrggbb"
          style={{ maxWidth: 100, padding: "6px 10px", fontSize: 12, fontFamily: "var(--f-mono)" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--muted)" }}>£</span>
        <input
          className={styles.fldInput}
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ maxWidth: 90, padding: "6px 10px", fontSize: 13 }}
        />
      </div>
      <button type="submit" className="primary" disabled={saving} style={{ padding: "6px 14px", fontSize: 13 }}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" className="ghost" onClick={onCancel} style={{ padding: "6px 14px", fontSize: 13 }}>
        Cancel
      </button>
    </form>
  );
}

// ── Add row ───────────────────────────────────────────────────────────────────
function AddRow({ onAdd }: { onAdd: (data: Omit<FrameOption, "id" | "order">) => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#c9a87c");
  const [price, setPrice] = useState("0");
  const [adding, setAdding] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await onAdd({ name: name.trim(), color, price: Number(price) });
    setName("");
    setColor("#c9a87c");
    setPrice("0");
    setAdding(false);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 36 }}>
      <input
        className={styles.fldInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Frame name (e.g. Oak, White, Walnut)"
        style={{ maxWidth: 220, padding: "8px 12px" }}
        required
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 36, height: 36, padding: 2, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}
        />
        <input
          className={styles.fldInput}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="#rrggbb"
          style={{ maxWidth: 100, padding: "8px 12px", fontSize: 12, fontFamily: "var(--f-mono)" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--muted)" }}>£</span>
        <input
          className={styles.fldInput}
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          style={{ maxWidth: 90, padding: "8px 12px" }}
        />
      </div>
      <button type="submit" className="primary" disabled={adding || !name.trim()}>
        {adding ? "Adding…" : "+ Add frame"}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FramesAdmin() {
  const [frames, setFrames] = useState<FrameOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragSourceIndex = useRef<number>(-1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFrames(await getFrames()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(data: Omit<FrameOption, "id" | "order">) {
    await createFrame({ ...data, order: frames.length });
    setToast("Frame added");
    await load();
  }

  async function handleSave(id: string, data: Partial<Omit<FrameOption, "id">>) {
    await updateFrame(id, data);
    setEditingId(null);
    setToast("Frame saved");
    await load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete frame "${name}"?`)) return;
    await deleteFrame(id);
    setToast("Frame deleted");
    await load();
  }

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, id: string, index: number) {
    setDragging(id);
    dragSourceIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(id);
  }
  async function handleDrop(e: React.DragEvent, targetId: string, targetIndex: number) {
    e.preventDefault();
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return; }
    const reordered = [...frames];
    const [moved] = reordered.splice(dragSourceIndex.current, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((f, i) => ({ ...f, order: i }));
    setFrames(withOrder);
    setDragging(null);
    setDragOver(null);
    await reorderFrames(withOrder.map((f) => ({ id: f.id, order: f.order })));
    setToast("Order saved");
  }
  function handleDragEnd() { setDragging(null); setDragOver(null); }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Frames</h1>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28, maxWidth: 520 }}>
        Frame options shown to buyers on each artwork page. The first frame with price&nbsp;0 is treated as &ldquo;Unframed&rdquo;. Drag rows to reorder.
      </p>

      <AddRow onAdd={handleAdd} />

      {loading ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 13 }}>Loading…</p>
      ) : frames.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No frames yet. Add one above.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 44 }}>Colour</th>
                <th>Name</th>
                <th>Price</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {frames.map((f, i) => (
                <tr
                  key={f.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, f.id, i)}
                  onDragOver={(e) => handleDragOver(e, f.id)}
                  onDrop={(e) => handleDrop(e, f.id, i)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragging === f.id ? 0.4 : 1,
                    background: dragOver === f.id && dragging !== f.id
                      ? "color-mix(in oklab, var(--ink) 5%, transparent)"
                      : undefined,
                    transition: "background 0.1s",
                  }}
                >
                  <td><span className={styles.dragHandle} title="Drag to reorder">⠿</span></td>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 11 }}>{i}</td>
                  <td>
                    <span
                      className={styles.swatch}
                      style={{
                        background: f.price === 0
                          ? "repeating-linear-gradient(135deg, transparent 0 4px, var(--line) 4px 5px)"
                          : f.color,
                        border: f.price === 0 ? "1px dashed var(--line)" : undefined,
                      }}
                    />
                  </td>
                  <td>
                    {editingId === f.id ? (
                      <EditRow
                        frame={f}
                        onSave={(data) => handleSave(f.id, data)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <span style={{ fontFamily: "var(--f-display)", fontSize: 16 }}>{f.name}</span>
                    )}
                  </td>
                  <td style={{ fontFamily: "var(--f-mono)", fontSize: 13 }}>
                    {editingId !== f.id && (f.price > 0 ? `£${f.price}` : <span style={{ color: "var(--muted)" }}>—</span>)}
                  </td>
                  <td>
                    {editingId !== f.id && (
                      <div className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => setEditingId(f.id)}>Edit</button>
                        <button className={styles.btnDelete} onClick={() => handleDelete(f.id, f.name)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </>
  );
}
