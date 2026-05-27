export interface Artwork {
  id: string;
  lotNumber: string;       // e.g. "AAA1", "TA4", "Tripple A 1" — viewer names the work
  title?: string;          // optional curator label, rarely used
  year?: number;
  medium?: string;
  dimensions?: string;
  edition?: string;
  price: number;
  category: string;        // dynamic — matches Category.name
  color: string;
  accent: string;
  series?: string;
  blurb?: string;
  imageUrl?: string;
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

export interface CartItem {
  id: string;
  artworkId: string;
  variantId: string;
  variantLabel: string;
  frame: "none" | "oak" | "black";
  price: number;
  qty: number;
}

export interface Variant {
  id: string;
  label: string;
  sub: string;
  price: number;
}

export type Theme = "bone" | "paper" | "ink" | "porcelain";
export type Typography = "editorial" | "classical" | "swiss";
export type Density = "compact" | "regular" | "spacious";
export type Sort = "curated" | "recent" | "series";
