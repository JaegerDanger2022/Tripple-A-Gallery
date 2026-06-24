"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  CSSProperties,
} from "react";
import type { CartItem, Theme, Typography, Density, Artwork, Category, FrameOption, FormatOption } from "@/lib/types";
import { ARTWORKS as STATIC_ARTWORKS } from "@/lib/data";
import { DEFAULT_SHIPPING_FEE, DIGITAL_PRICE } from "@/lib/pricing";

interface TweakValues {
  theme: Theme;
  typography: Typography;
  density: Density;
}

interface AppContextValue {
  // Tweaks
  tweaks: TweakValues;
  setTweak: <K extends keyof TweakValues>(key: K, value: TweakValues[K]) => void;
  cssVars: CSSProperties;
  // Data (Firestore-backed with static fallback)
  artworks: Artwork[];
  categories: Category[];
  frames: FrameOption[];
  formats: FormatOption[];
  shippingFee: number;        // flat fee for physical orders (admin-editable)
  digitalPrice: number;       // flat price for digital downloads (admin-editable)
  dataLoading: boolean;
  refreshData: () => void;
  // Cart
  cart: CartItem[];
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  // Cart reveal — tracks which artworks have had pricing revealed this session
  revealedArtworks: Set<string>;
  revealArtwork: (id: string) => void;
}

const DEFAULTS: TweakValues = { theme: "bone", typography: "editorial", density: "regular" };

const THEMES: Record<Theme, Record<string, string>> = {
  bone:      { bg: "#f6f4ef", surface: "#ffffff",  ink: "#1a1a1a", muted: "#6b675e", line: "rgba(26,26,26,0.12)",   accent: "#7a3b2e" },
  paper:     { bg: "#ecebe5", surface: "#f7f6f1",  ink: "#1c1c1a", muted: "#6e6a60", line: "rgba(28,28,26,0.14)",   accent: "#3a4a3a" },
  ink:       { bg: "#15151a", surface: "#1d1d22",  ink: "#f0ede5", muted: "#8e8a80", line: "rgba(240,237,229,0.14)",accent: "#d49a6a" },
  porcelain: { bg: "#fafaf7", surface: "#ffffff",  ink: "#111111", muted: "#74716a", line: "rgba(17,17,17,0.10)",   accent: "#2a3f7a" },
};

const FONTS: Record<Typography, Record<string, string>> = {
  editorial: { display: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif",    body: "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif", mono: "'Geist Mono', ui-monospace, monospace" },
  classical: { display: "'Cormorant Garamond', Georgia, serif",                         body: "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif", mono: "'Geist Mono', ui-monospace, monospace" },
  swiss:     { display: "'Geist', 'Helvetica Neue', Helvetica, sans-serif",             body: "'Geist', 'Helvetica Neue', Helvetica, sans-serif",         mono: "'Geist Mono', ui-monospace, monospace" },
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tweaks, setTweaks] = useState<TweakValues>(DEFAULTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  // Cart is hydrated from localStorage after mount (kept null-safe for SSR) so
  // it survives the full-page redirect out to Stripe Checkout and back.
  const [cartHydrated, setCartHydrated] = useState(false);
  const [revealedArtworks, setRevealedArtworks] = useState<Set<string>>(new Set());
  const [artworks, setArtworks] = useState<Artwork[]>(STATIC_ARTWORKS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [frames, setFrames] = useState<FrameOption[]>([]);
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [shippingFee, setShippingFee] = useState<number>(DEFAULT_SHIPPING_FEE);
  const [digitalPrice, setDigitalPrice] = useState<number>(DIGITAL_PRICE);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const { getArtworks, getCategories, getFrames, getFormats, getShippingFee, getDigitalPrice } = await import("@/lib/firestore");
      const [arts, cats, frs, fmts, ship, digital] = await Promise.all([getArtworks(), getCategories(), getFrames(), getFormats(), getShippingFee(), getDigitalPrice()]);
      setArtworks(arts);
      setCategories(cats);
      setFrames(frs);
      setFormats(fmts);
      setShippingFee(ship);
      setDigitalPrice(digital);
    } catch {
      // Firestore not configured yet — keep static fallback
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Hydrate the cart once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("aaa_cart");
      if (raw) setCart(JSON.parse(raw) as CartItem[]);
    } catch {
      // Corrupt/unavailable storage — start with an empty cart.
    }
    setCartHydrated(true);
  }, []);

  // Persist the cart on every change (but not before the initial hydrate, so we
  // don't clobber a stored cart with the empty initial state).
  useEffect(() => {
    if (!cartHydrated) return;
    try { localStorage.setItem("aaa_cart", JSON.stringify(cart)); } catch { /* ignore */ }
  }, [cart, cartHydrated]);

  const setTweak = useCallback(<K extends keyof TweakValues>(key: K, value: TweakValues[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCart((c) => {
      const found = c.find((x) => x.id === item.id);
      if (found) return c.map((x) => (x.id === item.id ? { ...x, qty: x.qty + item.qty } : x));
      return [...c, item];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => setCart((c) => c.filter((x) => x.id !== id)), []);
  const updateQty = useCallback((id: string, qty: number) => setCart((c) => c.map((x) => (x.id === id ? { ...x, qty } : x))), []);
  const clearCart = useCallback(() => setCart([]), []);
  const revealArtwork = useCallback((id: string) => setRevealedArtworks((s) => new Set(s).add(id)), []);

  const cartCount = useMemo(() => cart.reduce((s, it) => s + it.qty, 0), [cart]);

  const cssVars = useMemo(() => {
    const theme = THEMES[tweaks.theme];
    const font = FONTS[tweaks.typography];
    return {
      "--bg": theme.bg, "--surface": theme.surface, "--ink": theme.ink,
      "--muted": theme.muted, "--line": theme.line, "--accent": theme.accent,
      "--f-display": font.display, "--f-body": font.body, "--f-mono": font.mono,
    } as CSSProperties;
  }, [tweaks.theme, tweaks.typography]);

  return (
    <AppContext.Provider value={{
      tweaks, setTweak, cssVars,
      artworks, categories, frames, formats, shippingFee, digitalPrice, dataLoading, refreshData: loadData,
      cart, cartCount, cartOpen, setCartOpen, addToCart, removeFromCart, updateQty, clearCart,
      revealedArtworks, revealArtwork,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
