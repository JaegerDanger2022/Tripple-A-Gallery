// Server-only Stripe client + tier/price mapping.
// NEVER import this from a client component — it reads the secret key.
import Stripe from "stripe";
import type { Tier } from "./types";

// Lazily construct the Stripe client so importing this module never throws when
// STRIPE_SECRET_KEY is absent (e.g. during build's page-data collection). The
// API routes guard on the env var and return a clear 503 before calling in.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  // Let the SDK use its pinned API version (matches the installed major).
  _stripe = new Stripe(secretKey);
  return _stripe;
}

// Proxy so existing `stripe.checkout.sessions.create(...)` call sites keep
// working, while construction is deferred to first property access at runtime.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    // @ts-expect-error — dynamic passthrough to the real client.
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type BillingInterval = "month" | "year";

// Stripe Price IDs come from env so they're never hardcoded. Create the
// products/prices in the Stripe dashboard (see the README / setup notes) and
// paste the IDs into .env.local.
const PRICE_IDS: Record<1 | 2, Record<BillingInterval, string | undefined>> = {
  1: {
    month: process.env.STRIPE_PRICE_TIER1_MONTHLY,
    year: process.env.STRIPE_PRICE_TIER1_YEARLY,
  },
  2: {
    month: process.env.STRIPE_PRICE_TIER2_MONTHLY,
    year: process.env.STRIPE_PRICE_TIER2_YEARLY,
  },
};

/** The Stripe Price ID for a paid tier + interval, or undefined if not configured. */
export function priceIdFor(tier: 1 | 2, interval: BillingInterval): string | undefined {
  return PRICE_IDS[tier]?.[interval];
}

/** Reverse-map a Stripe Price ID back to the tier it grants (for fulfilment). */
export function tierForPriceId(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null;
  for (const tier of [1, 2] as const) {
    const ivals = PRICE_IDS[tier];
    if (ivals.month === priceId || ivals.year === priceId) return tier;
  }
  return null;
}
