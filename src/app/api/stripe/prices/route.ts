import { NextResponse } from "next/server";
import { fetchTierPricing } from "@/lib/stripe";

// Reads the Stripe secret — Node runtime. Prices change rarely, so cache the
// response for an hour rather than hitting Stripe on every page load.
export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Public, read-only: the live display amounts for the paid tiers, so /pricing
 * shows real Stripe prices (matching the toggle) instead of hardcoded numbers.
 * Returns `{ pricing: { 1: {month, year}, 2: {month, year} } }` with amounts in
 * minor units (pence). Unconfigured prices come back as null.
 */
export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  try {
    const pricing = await fetchTierPricing();
    return NextResponse.json({ pricing });
  } catch {
    return NextResponse.json({ error: "Could not load prices." }, { status: 502 });
  }
}
