import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { stripe } from "@/lib/stripe";
import { adminMarkOrderPaid } from "@/lib/orderAdmin";
import { sendOrderConfirmationEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * Called by the confirmation page after Checkout redirects back. Verifies the
 * session was paid and belongs to this user, then promotes the matching pending
 * order to "paid". The webhook does the same as a backup if the buyer closes the
 * tab before this runs. Idempotent — safe to call more than once.
 */
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return bad("Payments are not configured yet.", 503);

  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return bad("Sign in to confirm your order.", 401);

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

  let session: import("stripe").Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return bad("Could not verify that payment.", 404);
  }

  // Must belong to this user and be paid for.
  if (session.client_reference_id !== uid && session.metadata?.uid !== uid) {
    return bad("That checkout session doesn't belong to your account.", 403);
  }
  if (session.payment_status !== "paid") {
    return bad("Payment is not complete yet. If you were charged, refresh shortly.", 409);
  }

  const orderId = session.metadata?.orderId;
  if (!orderId) return bad("That session has no order to confirm.", 422);

  const result = await adminMarkOrderPaid(orderId, session.id);
  if (!result) return bad("We couldn't match that payment to an order.", 404);
  if (result.order.userId !== uid) return bad("That order doesn't belong to your account.", 403);

  // Send the receipt only on the transition that actually paid the order, so it
  // can't double up with the webhook. Best-effort — never fail the confirm on it.
  if (result.justPaid) {
    try { await sendOrderConfirmationEmail(result.order); } catch { /* mail is non-critical */ }
  }

  return NextResponse.json({ ok: true, orderId, total: result.order.total });
}
