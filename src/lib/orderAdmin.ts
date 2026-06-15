// Server-only order writes via the Firebase Admin SDK. Orders are created here
// (never from the client) so an order only exists because the server made it —
// and only flips to "paid" once Stripe confirms the payment.
import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import type { Order } from "./types";

const ordersDoc = (orderId: string) => adminDb.collection("orders").doc(orderId);

/** Create a not-yet-paid order ahead of redirecting the buyer to Stripe. */
export async function adminCreatePendingOrder(order: Order): Promise<void> {
  await ordersDoc(order.id).set({
    ...order,
    serverCreatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Promote a pending order to "paid". Idempotent and safe to call from both the
 * success redirect and the webhook: a no-op if the order is missing or already
 * past pending (so a later "shipped"/"delivered" is never clobbered).
 *
 * Returns the order plus `justPaid` — true ONLY for the single call that made the
 * pending→paid transition. Callers send the confirmation email when justPaid is
 * true, so it goes out exactly once no matter how many paths confirm the order.
 * Returns null when the order is missing or the session doesn't match.
 */
export async function adminMarkOrderPaid(
  orderId: string,
  expectSessionId?: string
): Promise<{ order: Order; justPaid: boolean } | null> {
  const ref = ordersDoc(orderId);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const order = snap.data() as Order;
    // Guard against confirming the wrong session against this order.
    if (expectSessionId && order.stripeSessionId && order.stripeSessionId !== expectSessionId) {
      return null;
    }
    const justPaid = order.status === "pending";
    if (justPaid) {
      tx.update(ref, { status: "paid", paidAt: FieldValue.serverTimestamp() });
    }
    return { order: { ...order, status: justPaid ? "paid" : order.status }, justPaid };
  });
}

/** The Stripe Checkout Session id linked to an order (for confirm verification). */
export async function adminOrderSessionId(orderId: string): Promise<string | null> {
  const snap = await ordersDoc(orderId).get();
  return snap.exists ? (snap.data()?.stripeSessionId ?? null) : null;
}
