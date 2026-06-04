import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { stripe, priceIdFor, type BillingInterval } from "@/lib/stripe";

// Touches the Admin SDK + Stripe secret — Node runtime, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return bad("Payments are not configured yet.", 503);

  // 1) Verify the caller's Firebase ID token.
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return bad("Sign in to upgrade.", 401);

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? undefined;
  } catch {
    return bad("Your session has expired. Sign in again.", 401);
  }

  // 2) Validate the requested tier + billing interval.
  let body: { tier?: number; interval?: string };
  try { body = await req.json(); } catch { return bad("Invalid request body."); }

  const tier = body.tier;
  const interval = body.interval as BillingInterval | undefined;
  if (tier !== 1 && tier !== 2) return bad("Choose tier 1 or 2.");
  if (interval !== "month" && interval !== "year") return bad("Choose a monthly or yearly plan.");

  const priceId = priceIdFor(tier, interval);
  if (!priceId) return bad("That plan isn't available yet. Please contact the studio.", 503);

  // 3) Create the subscription Checkout Session. We stash uid + tier in metadata
  //    and client_reference_id so fulfilment (success redirect + webhook) can map
  //    the payment back to the right user and grant exactly the tier they bought.
  const origin = req.nextUrl.origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: uid,
      metadata: { uid, tier: String(tier) },
      subscription_data: { metadata: { uid, tier: String(tier) } },
      success_url: `${origin}/account?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?upgrade=cancelled`,
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return bad("Could not start checkout. Please try again.", 500);
  }
}
