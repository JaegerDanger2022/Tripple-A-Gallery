import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, tierForPriceId } from "@/lib/stripe";
import { adminSetTier, adminLinkStripe, adminUidForCustomer, adminIsTierLocked } from "@/lib/userAdmin";
import type { Tier } from "@/lib/types";

// Must read the raw body for signature verification — Node runtime, no caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe subscription lifecycle → tier. The success-redirect (/api/stripe/confirm)
 * grants tier on purchase; this webhook keeps it in sync afterwards:
 *  • subscription updated to active   → grant the tier for its price
 *  • subscription canceled / unpaid   → revert to tier 0
 * A downgrade simply lowers `tier`; the user's stored 5/15 random works are never
 * touched, so they fall back to exactly what they originally had.
 */
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const uid = await uidFromSubscription(sub);
        // Respect the admin lock — a locked tier is never changed by Stripe.
        if (uid && !(await adminIsTierLocked(uid))) await adminSetTier(uid, 0);
        break;
      }
      default:
        // Ignore everything else.
        break;
    }
  } catch {
    // Return 500 so Stripe retries — don't swallow processing failures.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Resolve the app uid for a subscription: prefer metadata (set at checkout),
// fall back to the stored Stripe customer link.
async function uidFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const metaUid = sub.metadata?.uid;
  if (metaUid) return metaUid;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  return customerId ? adminUidForCustomer(customerId) : null;
}

async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const uid = await uidFromSubscription(sub);
  if (!uid) return;

  // Always keep the Stripe link current so future events map back to this uid,
  // even when the tier itself is admin-locked.
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  await adminLinkStripe(uid, { stripeCustomerId: customerId, stripeSubscriptionId: sub.id });

  // Respect the admin lock — the manually-set tier wins over Stripe.
  if (await adminIsTierLocked(uid)) return;

  // Active/trialing → grant the tier for the subscription's price. Anything else
  // (past_due, canceled, unpaid, incomplete_expired) → drop to tier 0.
  const active = sub.status === "active" || sub.status === "trialing";
  const priceId = sub.items.data[0]?.price?.id;
  const tier: Tier = active ? (tierForPriceId(priceId) ?? 0) : 0;

  await adminSetTier(uid, tier);
}
