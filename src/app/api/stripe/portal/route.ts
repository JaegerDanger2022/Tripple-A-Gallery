import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import { adminStripeCustomerId } from "@/lib/userAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// Same public-origin resolution as checkout: behind App Hosting's proxy the
// server binds to 0.0.0.0:8080, so the request's own origin is unreachable.
function publicOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("localhost")) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}

/**
 * Opens a Stripe Billing Portal session for the signed-in user, where they can
 * cancel or switch plans and update payment. The resulting subscription change
 * arrives as a webhook (customer.subscription.updated/deleted), which syncs the
 * tier — this route only hands the user off to Stripe's hosted portal.
 */
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return bad("Billing is not configured yet.", 503);

  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return bad("Sign in to manage billing.", 401);

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid;
  } catch {
    return bad("Your session has expired. Sign in again.", 401);
  }

  // The customer id is stored server-side once a subscription starts. No id ⇒
  // the user has never subscribed, so there's nothing to manage.
  const customerId = await adminStripeCustomerId(uid);
  if (!customerId) return bad("No active subscription to manage.", 404);

  const origin = publicOrigin(req);
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return bad("Could not open the billing portal. Please try again.", 500);
  }
}
