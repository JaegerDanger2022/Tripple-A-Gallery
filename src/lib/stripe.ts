// Server-only Stripe client + tier/price mapping.
// NEVER import this from a client component — it reads the secret key.
import Stripe from "stripe";
import type { Tier } from "./types";

// ── Test/Live mode switch ──────────────────────────────────────────────────
// One toggle controls everything: STRIPE_MODE=test|live (defaults to "test",
// the safe choice). For each credential we prefer the mode-specific variable
// (…_TEST / …_LIVE) and fall back to the legacy un-suffixed variable, so an
// existing single-key setup keeps working unchanged.
export type StripeMode = "test" | "live";

export function stripeMode(): StripeMode {
  return (process.env.STRIPE_MODE ?? "").toLowerCase() === "live" ? "live" : "test";
}

/** Resolve an env var for the active mode: `${base}_TEST|_LIVE` then bare `${base}`. */
function envForMode(base: string): string | undefined {
  const specific = process.env[`${base}_${stripeMode().toUpperCase()}`];
  return specific ?? process.env[base];
}

/** The active Stripe secret key for the current mode. */
export function stripeSecretKey(): string | undefined {
  return envForMode("STRIPE_SECRET_KEY");
}

/** The active webhook signing secret for the current mode. */
export function stripeWebhookSecret(): string | undefined {
  return envForMode("STRIPE_WEBHOOK_SECRET");
}

// Lazily construct the Stripe client so importing this module never throws when
// the secret key is absent (e.g. during build's page-data collection). The API
// routes guard on stripeSecretKey() and return a clear 503 before calling in.
// Rebuild if the resolved key changes (e.g. mode flipped between requests).
let _stripe: Stripe | null = null;
let _stripeKey: string | null = null;
function getStripe(): Stripe {
  const secretKey = stripeSecretKey();
  if (!secretKey) throw new Error("Stripe secret key is not set (STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST/_LIVE).");
  if (_stripe && _stripeKey === secretKey) return _stripe;
  // Let the SDK use its pinned API version (matches the installed major).
  _stripe = new Stripe(secretKey);
  _stripeKey = secretKey;
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

// Stripe Price IDs come from env so they're never hardcoded, and are mode-aware:
// STRIPE_PRICE_TIER1_MONTHLY_TEST / _LIVE (falling back to the un-suffixed name).
// Create the products/prices in the Stripe dashboard (test AND live) and paste
// the IDs into .env.local / apphosting.yaml.
function priceEnvBase(tier: 1 | 2, interval: BillingInterval): string {
  return `STRIPE_PRICE_TIER${tier}_${interval === "month" ? "MONTHLY" : "YEARLY"}`;
}

/** The Stripe Price ID for a paid tier + interval (current mode), or undefined. */
export function priceIdFor(tier: 1 | 2, interval: BillingInterval): string | undefined {
  return envForMode(priceEnvBase(tier, interval));
}

/** Reverse-map a Stripe Price ID back to the tier it grants (for fulfilment). */
export function tierForPriceId(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null;
  for (const tier of [1, 2] as const) {
    for (const interval of ["month", "year"] as const) {
      if (priceIdFor(tier, interval) === priceId) return tier;
    }
  }
  return null;
}

// ── Live price display ───────────────────────────────────────────────────────
// The /pricing page shows the real amounts from Stripe (it's display-only — the
// charge is always the Stripe price). Amounts are minor units (pence) as Stripe
// returns them; the client formats with Intl using `currency`.

/** A single tier's amounts, looked up live from Stripe. */
export interface TierPricing {
  month: { amount: number; currency: string } | null;
  year: { amount: number; currency: string } | null;
}

/** Live amounts for both paid tiers, keyed by tier. Missing/unconfigured prices
 *  come back as null so the page can degrade gracefully rather than throw. */
export type PricingResponse = Record<1 | 2, TierPricing>;

/**
 * Fetch the configured prices from Stripe for display. Looks up each of the four
 * price IDs and returns its unit amount + currency. Any price that isn't
 * configured, can't be fetched, or has no fixed unit amount is returned as null.
 */
export async function fetchTierPricing(): Promise<PricingResponse> {
  const empty: TierPricing = { month: null, year: null };
  const result: PricingResponse = { 1: { ...empty }, 2: { ...empty } };

  const lookups: Array<{ tier: 1 | 2; interval: BillingInterval; id: string }> = [];
  for (const tier of [1, 2] as const) {
    for (const interval of ["month", "year"] as const) {
      const id = priceIdFor(tier, interval);
      if (id) lookups.push({ tier, interval, id });
    }
  }

  await Promise.all(
    lookups.map(async ({ tier, interval, id }) => {
      try {
        const price = await stripe.prices.retrieve(id);
        // unit_amount is null for metered/tiered prices — we only show fixed ones.
        if (price.unit_amount != null) {
          result[tier][interval] = { amount: price.unit_amount, currency: price.currency };
        }
      } catch {
        // Leave as null — a single bad ID shouldn't break the whole page.
      }
    })
  );

  return result;
}
