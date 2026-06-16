// Single source of truth for line-item pricing, shared by the work detail page
// (what the buyer sees) and the checkout API (what they're charged). Keeping the
// math in one place guarantees the two never drift apart. Pure functions only —
// no Firebase/Stripe imports, so it's safe on both client and server.
import type { Artwork, FormatOption, FrameOption, Variant } from "./types";
import { getVariants } from "./data";

// Price for the digital download option — flat for any work.
export const DIGITAL_PRICE = 15;

// Fallback flat shipping fee (physical orders) when the admin setting is unset.
// The live value is stored in Firestore (settings/shipping) and editable in the
// admin panel; this is only used if that read fails or hasn't been configured.
export const DEFAULT_SHIPPING_FEE = 24;

const UNFRAMED: FrameOption = { id: "none", name: "Unframed", color: "#e8e4dc", price: 0, order: -1 };

/**
 * The selectable formats/variants for an artwork. Prefers admin-configured
 * Firestore formats; falls back to the static defaults. Prepends the digital
 * download when the work has a private hi-res file.
 */
export function buildVariants(a: Artwork, formats: FormatOption[]): Variant[] {
  const base: Variant[] = formats.length > 0
    ? formats
        .filter((f) => f.enabled)
        .map((f) => {
          // fixed with price 0 = use the artwork's own price (e.g. Original)
          const isOriginal = f.priceMode === "fixed" && f.fixedPrice <= 0;
          return {
            id: f.id,
            label: f.name,
            sub: f.description,
            price: f.priceMode === "fixed"
              ? (f.fixedPrice > 0 ? f.fixedPrice : a.price || 0)
              : Math.round((a.price || 200) * f.percentBase + f.percentAdd),
            isOriginal,
          };
        })
    : getVariants(a);

  if (a.hiResPath) {
    const digital: Variant = {
      id: "digital",
      label: "Digital download",
      sub: "High-res image · instant download · personal use",
      price: DIGITAL_PRICE,
      isDigital: true,
    };
    return [digital, ...base];
  }
  return base;
}

/** Frame choices: admin frames if configured, else just "Unframed". */
export function frameOptions(frames: FrameOption[]): FrameOption[] {
  return frames.length > 0 ? frames : [UNFRAMED];
}

export interface ResolvedLine {
  unitPrice: number;     // £, variant + frame (frame only for physical)
  variantLabel: string;
  frameLabel: string;
  isDigital: boolean;
}

/**
 * Authoritatively resolve a cart line's price + labels from server-trusted data
 * (the artwork/formats/frames as stored, NOT the client's claimed price).
 * Returns null when the selection isn't purchasable online — unknown variant, or
 * an Original (sold by enquiry only).
 */
export function resolveLine(
  a: Artwork,
  formats: FormatOption[],
  frames: FrameOption[],
  sel: { variantId: string; frameId: string }
): ResolvedLine | null {
  const v = buildVariants(a, formats).find((x) => x.id === sel.variantId);
  if (!v || v.isOriginal) return null;

  if (v.isDigital) {
    return { unitPrice: v.price, variantLabel: v.label, frameLabel: "Digital file", isDigital: true };
  }

  const opts = frameOptions(frames);
  const frame = opts.find((f) => f.id === sel.frameId) ?? opts[0];
  return {
    unitPrice: v.price + (frame?.price ?? 0),
    variantLabel: v.label,
    frameLabel: frame?.name ?? "Unframed",
    isDigital: false,
  };
}
