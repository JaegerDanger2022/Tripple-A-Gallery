// Firestore data access — artworks and categories CRUD
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Artwork, Category } from "./types";
import { ARTWORKS as SEED_ARTWORKS } from "./data";

// ── Collections ─────────────────────────────────────────────────────────────

const artworksCol = () => collection(db, "artworks");
const categoriesCol = () => collection(db, "categories");

// ── Artworks ─────────────────────────────────────────────────────────────────

export async function getArtworks(): Promise<Artwork[]> {
  const snap = await getDocs(query(artworksCol(), orderBy("order", "asc")));
  if (snap.empty) return SEED_ARTWORKS; // fall back to static data when Firestore not configured
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Artwork));
}

export async function getArtwork(id: string): Promise<Artwork | null> {
  const snap = await getDoc(doc(db, "artworks", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Artwork;
}

export async function createArtwork(
  data: Omit<Artwork, "id">
): Promise<string> {
  const ref = await addDoc(artworksCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateArtwork(
  id: string,
  data: Partial<Omit<Artwork, "id">>
): Promise<void> {
  await updateDoc(doc(db, "artworks", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteArtwork(id: string): Promise<void> {
  await deleteDoc(doc(db, "artworks", id));
}

// ── Categories ───────────────────────────────────────────────────────────────

const SEED_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Painting", order: 0 },
  { name: "Drawing",  order: 1 },
  { name: "Print",    order: 2 },
];

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(query(categoriesCol(), orderBy("order", "asc")));
  if (snap.empty) return SEED_CATEGORIES.map((c, i) => ({ ...c, id: String(i) }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
}

export async function createCategory(name: string): Promise<string> {
  const existing = await getCategories();
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.order), -1);
  const ref = await addDoc(categoriesCol(), { name, order: maxOrder + 1 });
  return ref.id;
}

export async function updateCategory(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, "categories", id), { name });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

export async function reorderCategories(
  ordered: { id: string; order: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  ordered.forEach(({ id, order }) => {
    batch.update(doc(db, "categories", id), { order });
  });
  await batch.commit();
}

// ── Seed helper (call once from admin) ───────────────────────────────────────

export async function seedFirestore(): Promise<void> {
  const batch = writeBatch(db);

  // Seed categories
  const catSnap = await getDocs(categoriesCol());
  if (catSnap.empty) {
    SEED_CATEGORIES.forEach((cat, i) => {
      const ref = doc(categoriesCol());
      batch.set(ref, { ...cat, order: i });
    });
  }

  // Seed artworks
  const artSnap = await getDocs(artworksCol());
  if (artSnap.empty) {
    SEED_ARTWORKS.forEach((art, i) => {
      const ref = doc(db, "artworks", art.id);
      const { id, ...rest } = art;
      batch.set(ref, { ...rest, order: i, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
  }

  await batch.commit();
}
