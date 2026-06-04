// Firestore data access — artworks, categories and frames CRUD
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
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "./firebase";
import type { Artwork, Category, FrameOption, FormatOption, Order, Tier, UserProfile } from "./types";
import { ARTWORKS as SEED_ARTWORKS } from "./data";
import { assignWorks } from "./tier";

// ── Collections ─────────────────────────────────────────────────────────────

const artworksCol = () => collection(db, "artworks");
const categoriesCol = () => collection(db, "categories");
const framesCol = () => collection(db, "frames");
const formatsCol = () => collection(db, "formats");

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

// ── Frames ───────────────────────────────────────────────────────────────────

export async function getFrames(): Promise<FrameOption[]> {
  const snap = await getDocs(query(framesCol(), orderBy("order", "asc")));
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FrameOption));
}

export async function createFrame(data: Omit<FrameOption, "id">): Promise<string> {
  const existing = await getFrames();
  const maxOrder = existing.reduce((m, f) => Math.max(m, f.order), -1);
  const ref = await addDoc(framesCol(), { ...data, order: maxOrder + 1 });
  return ref.id;
}

export async function updateFrame(id: string, data: Partial<Omit<FrameOption, "id">>): Promise<void> {
  await updateDoc(doc(db, "frames", id), data);
}

export async function deleteFrame(id: string): Promise<void> {
  await deleteDoc(doc(db, "frames", id));
}

export async function reorderFrames(ordered: { id: string; order: number }[]): Promise<void> {
  const batch = writeBatch(db);
  ordered.forEach(({ id, order }) => batch.update(doc(db, "frames", id), { order }));
  await batch.commit();
}

// ── Formats ──────────────────────────────────────────────────────────────────

export async function getFormats(): Promise<FormatOption[]> {
  const snap = await getDocs(query(formatsCol(), orderBy("order", "asc")));
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FormatOption));
}

export async function createFormat(data: Omit<FormatOption, "id">): Promise<string> {
  const ref = await addDoc(formatsCol(), data);
  return ref.id;
}

export async function updateFormat(id: string, data: Partial<Omit<FormatOption, "id">>): Promise<void> {
  await updateDoc(doc(db, "formats", id), data);
}

export async function deleteFormat(id: string): Promise<void> {
  await deleteDoc(doc(db, "formats", id));
}

export async function reorderFormats(ordered: { id: string; order: number }[]): Promise<void> {
  const batch = writeBatch(db);
  ordered.forEach(({ id, order }) => batch.update(doc(db, "formats", id), { order }));
  await batch.commit();
}

// ── Orders ───────────────────────────────────────────────────────────────────

const ordersCol = () => collection(db, "orders");

export async function createOrder(order: Omit<Order, "createdAt"> & { createdAt?: number }): Promise<void> {
  // Use the human-facing order id as the document id so it's easy to look up.
  await setDoc(doc(db, "orders", order.id), {
    ...order,
    createdAt: order.createdAt ?? Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  // Avoids a composite index: filter by user, sort client-side by createdAt.
  const snap = await getDocs(query(ordersCol(), where("userId", "==", userId)));
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

// ── Users (tiered access) ────────────────────────────────────────────────────

const usersCol = () => collection(db, "users");

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

/**
 * Return the user's profile, creating it on first sign-in. New users get tier 0
 * with a freshly assigned random set of works (base 5 + 10 extra reserved for a
 * tier-1 upgrade). Subsequent calls just read the stored profile, so the random
 * set is stable across sessions and devices.
 */
export async function ensureUserProfile(uid: string, email: string): Promise<UserProfile> {
  const existing = await getUserProfile(uid);
  if (existing) return existing;

  // Assign from the live catalogue so the works actually exist.
  const arts = await getArtworks();
  const { tier0Works, tier1Works } = assignWorks(arts.map((a) => a.id));

  const now = Date.now();
  const profile: UserProfile = {
    uid,
    email,
    tier: 0,
    tier0Works,
    tier1Works,
    createdAt: now,
    updatedAt: now,
  };
  // Store everything except uid (it's the doc id).
  const { uid: _omit, ...data } = profile;
  await setDoc(doc(db, "users", uid), { ...data, serverCreatedAt: serverTimestamp() });
  return profile;
}

/** Admin: set a user's tier (0/1/2) until subscriptions drive this automatically. */
export async function setUserTier(uid: string, tier: Tier): Promise<void> {
  await updateDoc(doc(db, "users", uid), { tier, updatedAt: Date.now() });
}

/** Admin: list all user profiles, newest first. */
export async function listUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(usersCol());
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ── Storage uploads ──────────────────────────────────────────────────────────

/**
 * Upload a hi-res file for an artwork's digital download to a PRIVATE Storage
 * path. Returns the storage path (not a public URL) — the file is only ever
 * served to verified buyers via a short-lived signed URL from /api/download.
 */
export async function uploadHiResImage(artworkId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  // Encode the artwork id so ids containing spaces/slashes are path-safe.
  const path = `hires/${encodeURIComponent(artworkId)}/${Date.now()}-${safeName}`;
  const r = storageRef(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
  return path;
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
