export interface Artwork {
  id: string;
  lotNumber: string;       // e.g. "AAA1", "TA4", "Tripple A 1" — viewer names the work
  title?: string;          // optional curator label, rarely used
  year?: number;
  medium?: string;
  dimensions?: string;
  edition?: string;
  price: number;
  soldOut?: boolean;       // original (1-of-1) is sold — hides price, shows "Sold" chip
  category: string;        // dynamic — matches Category.name
  color: string;
  accent: string;
  series?: string;
  blurb?: string;
  imageUrl?: string;
  hiResPath?: string;      // PRIVATE Storage path of the full-res digital-download file
                           // (served only via signed URL to verified buyers)
  digitalEnabled?: boolean; // when a hi-res file is present, whether the digital
                           // download is offered for sale. Undefined = enabled, so
                           // existing works with a hi-res file stay purchasable.
  order?: number;          // for custom sort in browse
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Artist {
  name: string;
  based: string;
  born: number;
  bio: string[];
  statement: string;
}

export interface FrameOption {
  id: string;
  name: string;        // e.g. "Oak", "Black ash", "White"
  color: string;       // CSS hex for swatch
  price: number;       // added on top of variant price; 0 = unframed
  order: number;
}

export interface CartItem {
  id: string;
  artworkId: string;
  variantId: string;
  variantLabel: string;
  frameId: string;     // FrameOption.id, or "none"
  frameLabel: string;  // FrameOption.name, or "Unframed"
  price: number;
  qty: number;
  isDigital?: boolean;       // digital download — delivered as a file, not shipped
  lotNumber?: string;        // for display in order history
}

export interface OrderItem {
  artworkId: string;
  lotNumber: string;
  variantLabel: string;
  frameLabel: string;
  price: number;
  qty: number;
  isDigital?: boolean;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  postal: string;
  country: string;
}

export interface Order {
  id: string;              // human-facing order id, e.g. "AI-7F3K2A"
  userId: string;          // Firebase auth uid
  email: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  // "pending" = checkout started, awaiting Stripe payment. Promoted to "paid"
  // by Stripe fulfilment (order-confirm redirect / webhook). Only paid+ orders
  // grant digital downloads. "cancelled" marks an abandoned/expired checkout.
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: number;       // epoch ms (mirrors serverTimestamp for client sorting)
  shipTo?: ShippingAddress;      // destination captured at checkout (physical orders)
  stripeSessionId?: string;      // the Checkout Session that paid for this order
}

// ── Tiered access ──────────────────────────────────────────────────────────
// Tier 0: sees only `tier0Works` (5 random). Tier 1: `tier0Works` + `tier1Works`
// (+10 random). Tier 2: the whole catalogue. The random sets are assigned once
// on first sign-in and never reshuffled, so an upgrade only *adds* works.
export type Tier = 0 | 1 | 2;

export interface UserProfile {
  uid: string;
  email: string;
  tier: Tier;
  tier0Works: string[];   // 5 artwork ids — the base set, stable forever
  tier1Works: string[];   // +10 ids, disjoint from tier0Works — revealed at tier 1
  createdAt: number;      // epoch ms
  updatedAt: number;      // epoch ms
  stripeCustomerId?: string;     // set server-side once the user starts a subscription
  stripeSubscriptionId?: string; // current active subscription, for webhook mapping
  adminTierLock?: boolean;       // when true, Stripe fulfilment NEVER changes tier —
                                 // the admin-set tier always wins until unlocked.
  notifiedTier?: Tier;           // last tier the user was emailed about — used to
                                 // send membership change emails exactly once.
  shipTo?: ShippingAddress;      // last shipping address used at checkout — saved
                                 // so it can pre-fill the next order.
}

export interface FormatOption {
  id: string;
  name: string;           // e.g. "Print, small"
  description: string;    // e.g. "A4 · open edition · giclée"
  priceMode: "fixed" | "percent";
  fixedPrice: number;     // used when priceMode = "fixed"
  percentBase: number;    // multiplier of artwork price, e.g. 0.15
  percentAdd: number;     // flat amount added after %, e.g. 140
  order: number;
  enabled: boolean;
}

export interface Variant {
  id: string;
  label: string;
  sub: string;
  price: number;
  isOriginal?: boolean;   // the 1-of-1 original — not sold online; price hidden
  isDigital?: boolean;    // digital download — no framing/shipping; downloads the image
}

export type Theme = "bone" | "paper" | "ink" | "porcelain";
export type Typography = "editorial" | "classical" | "swiss";
export type Density = "compact" | "regular" | "spacious";
export type Sort = "curated" | "recent" | "series";
