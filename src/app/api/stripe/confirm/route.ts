import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { stripe, tierForPriceId } from "@/lib/stripe";
import { adminSetTier, adminLinkStripe, adminIsTierLocked } from "@/lib/userAdmin";
import type { Tier } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * Called by the success page after Checkout redirects back. Verifies the session
 * really was paid and belongs to this signed-in user, then grants the tier
 * server-side (Admin SDK). The webhook handles later cancellations/renewals.
 */
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return bad("Payments are not configured yet.", 503);

  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return bad("Sign in to confirm your upgrade.", 401);

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid;
  } catch {
    return bad("Your session has expired. Sign in again.", 401);
  }

  let body: { sessionId?: string };
  try { body = await req.json(); } catch { return bad("Invalid request body."); }
  const sessionId = body.sessionId;
  if (!sessionId) return bad("Missing session id.");

  // Retrieve the session with the subscription + line items expanded.
  let session: import("stripe").Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "subscription"],
    });
  } catch {
    return bad("Could not verify that payment.", 404);
  }

  // The session must belong to THIS user and be paid for.
  if (session.client_reference_id !== uid && session.metadata?.uid !== uid) {
    return bad("That checkout session doesn't belong to your account.", 403);
  }
  if (session.payment_status !== "paid") {
    return bad("Payment is not complete yet. If you were charged, refresh shortly.", 409);
  }

  // Determine the tier from the purchased price (authoritative), falling back to metadata.
  const priceId = session.line_items?.data?.[0]?.price?.id;
  const tier: Tier | null =
    tierForPriceId(priceId) ?? (session.metadata?.tier ? (Number(session.metadata.tier) as Tier) : null);
  if (tier !== 1 && tier !== 2) return bad("Could not determine the purchased tier.", 422);

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  // Always record the Stripe link so the subscription is tracked.
  await adminLinkStripe(uid, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });

  // Respect the admin lock — if an admin has pinned this user's tier, a payment
  // does NOT override it. (Edge case; surfaced so the client can explain.)
  if (await adminIsTierLocked(uid)) {
    return NextResponse.json({ ok: true, tier: null, locked: true });
  }

  await adminSetTier(uid, tier);
  return NextResponse.json({ ok: true, tier });
}
