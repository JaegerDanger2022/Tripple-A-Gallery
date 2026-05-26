"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Category } from "@/lib/types";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/lib/firestore";
import styles from "../admin.module.css";

// ── Toast helper ─────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={styles.toast}>{msg}</div>;
}

// ── Inline rename row ─────────────────────────────────────────────────────────
function RenameRow({
  cat,
  onSave,
  onCancel,
}: {
  cat: Category;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(cat.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === cat.name) { onCancel(); return; }
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        ref={inputRef}
        className={styles.fldInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ maxWidth: 260, padding: "6px 10px", fontSize: 14 }}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <button type="submit" className="primary" disabled={saving} style={{ padding: "6px 14px", fontSize: 13 }}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" className="ghost" onClick={onCancel} style={{ padding: "6px 14px", fontSize: 13 }}>
        Cancel
      </button>
    </form>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragSourceIndex = useRef<number>(-1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createCategory(newName.trim());
      setNewName("");
      setToast("Category added");
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string, name: string) {
    await updateCategory(id, name);
    setEditingId(null);
    setToast("Category renamed");
    await load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Artworks in this category will not be deleted, but will have no category.`)) return;
    await deleteCategory(id);
    setToast("Category deleted");
    await load();
  }

  // ── Drag-and-drop reorder ────────────────────────────────────────────────
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
    if (!dragging || dragging === targetId) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    const reordered = [...categories];
    const srcIdx = dragSourceIndex.current;
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(targetIndex, 0, moved);

    const withOrder = reordered.map((c, i) => ({ ...c, order: i }));
    setCategories(withOrder);
    setDragging(null);
    setDragOver(null);

    await reorderCategories(withOrder.map((c) => ({ id: c.id, order: c.order })));
    setToast("Order saved");
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Categories</h1>
      </div>

      {/* Add new category */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 36 }}>
        <input
          className={styles.fldInput}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name…"
          style={{ maxWidth: 300 }}
        />
        <button type="submit" className="primary" disabled={adding || !newName.trim()}>
          {adding ? "Adding…" : "+ Add category"}
        </button>
      </form>

      {loading ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 13 }}>Loading…</p>
      ) : categories.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No categories yet. Add one above.</p>
      ) : (
        <>
          <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>
            Drag rows to reorder
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th style={{ width: 40 }}>#</th>
                <th>Name</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr
                  key={cat.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cat.id, i)}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDrop={(e) => handleDrop(e, cat.id, i)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragging === cat.id ? 0.4 : 1,
                    background: dragOver === cat.id && dragging !== cat.id
                      ? "color-mix(in oklab, var(--ink) 5%, transparent)"
                      : undefined,
                    transition: "background 0.1s",
                  }}
                >
                  <td>
                    <span className={styles.dragHandle} title="Drag to reorder">⠿</span>
                  </td>
                  <td style={{ color: "var(--muted)", fontFamily: "var(--f-mono)", fontSize: 11 }}>{i}</td>
                  <td>
                    {editingId === cat.id ? (
                      <RenameRow
                        cat={cat}
                        onSave={(name) => handleRename(cat.id, name)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <span style={{ fontFamily: "var(--f-display)", fontSize: 17 }}>{cat.name}</span>
                    )}
                  </td>
                  <td>
                    {editingId !== cat.id && (
                      <div className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => setEditingId(cat.id)}>Rename</button>
                        <button className={styles.btnDelete} onClick={() => handleDelete(cat.id, cat.name)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </>
  );
}
