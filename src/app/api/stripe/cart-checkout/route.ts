import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { stripe, stripeSecretKey } from "@/lib/stripe";
import { resolveLine, DEFAULT_SHIPPING_FEE, DIGITAL_PRICE } from "@/lib/pricing";
import { adminCreatePendingOrder } from "@/lib/orderAdmin";
import { publicOrigin } from "@/lib/requestOrigin";
import type { Artwork, FormatOption, FrameOption, OrderItem, ShippingAddress } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

interface IncomingItem {
  artworkId?: string;
  variantId?: string;
  frameId?: string;
  qty?: number;
}

/**
 * Create a Stripe Checkout Session (mode: payment) for the cart and a matching
 * pending order. Prices are recomputed server-side from the stored artwork /
 * formats / frames — the client's claimed prices are never trusted. The order is
 * promoted to "paid" only once Stripe confirms (order-confirm redirect + webhook).
 */
export async function POST(req: NextRequest) {
  if (!stripeSecretKey()) return bad("Payments are not configured yet.", 503);

  // 1) Authenticate the buyer.
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return bad("Sign in to complete your purchase.", 401);

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? undefined;
    // Require a verified email — defence-in-depth behind the client gate.
    if (!decoded.email_verified) return bad("Please verify your email before checking out.", 403);
  } catch {
    return bad("Your session has expired. Sign in again.", 401);
  }

  // 2) Parse + sanity-check the request.
  let body: { items?: IncomingItem[]; email?: string; shipTo?: Partial<ShippingAddress> };
  try { body = await req.json(); } catch { return bad("Invalid request body."); }

  const incoming = Array.isArray(body.items) ? body.items : [];
  if (incoming.length === 0) return bad("Your cart is empty.");
  if (incoming.length > 50) return bad("Too many items in one order.");

  // 3) Load the catalogue + shipping setting server-side — the source of truth.
  const [artSnap, fmtSnap, frmSnap, shipSnap, digitalSnap] = await Promise.all([
    adminDb.collection("artworks").get(),
    adminDb.collection("formats").get(),
    adminDb.collection("frames").get(),
    adminDb.collection("settings").doc("shipping").get(),
    adminDb.collection("settings").doc("digital").get(),
  ]);
  const artworks = new Map<string, Artwork>(
    artSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Artwork])
  );
  const formats = fmtSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FormatOption));
  const frames = frmSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FrameOption));
  const shipFeeRaw = shipSnap.exists ? shipSnap.data()?.fee : undefined;
  const shippingFee = typeof shipFeeRaw === "number" && shipFeeRaw >= 0 ? shipFeeRaw : DEFAULT_SHIPPING_FEE;
  const digitalPriceRaw = digitalSnap.exists ? digitalSnap.data()?.price : undefined;
  const digitalPrice = typeof digitalPriceRaw === "number" && digitalPriceRaw >= 0 ? digitalPriceRaw : DIGITAL_PRICE;

  // 4) Resolve every line authoritatively → order items + Stripe line items.
  const orderItems: OrderItem[] = [];
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let hasPhysical = false;

  for (const raw of incoming) {
    const artwork = raw.artworkId ? artworks.get(raw.artworkId) : undefined;
    if (!artwork) return bad("One of your items is no longer available.", 409);

    const resolved = resolveLine(artwork, formats, frames, {
      variantId: raw.variantId ?? "",
      frameId: raw.frameId ?? "none",
    }, digitalPrice);
    if (!resolved) return bad(`"${artwork.lotNumber}" can't be purchased online in that format.`, 409);

    const qty = Math.max(1, Math.min(99, Math.floor(Number(raw.qty) || 1)));
    if (!resolved.isDigital) hasPhysical = true;

    orderItems.push({
      artworkId: artwork.id,
      lotNumber: artwork.lotNumber ?? "",
      variantLabel: resolved.variantLabel,
      frameLabel: resolved.frameLabel,
      price: resolved.unitPrice,
      qty,
      ...(resolved.isDigital ? { isDigital: true } : {}),
    });

    const frameSuffix =
      resolved.frameLabel && !["Unframed", "Digital file"].includes(resolved.frameLabel)
        ? ` · ${resolved.frameLabel}`
        : "";
    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(resolved.unitPrice * 100),
        product_data: {
          name: `Lot ${artwork.lotNumber} — ${resolved.variantLabel}${frameSuffix}`,
          metadata: { artworkId: artwork.id, isDigital: String(resolved.isDigital) },
        },
      },
    });
  }

  const subtotal = orderItems.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = hasPhysical ? shippingFee : 0;
  const total = subtotal + shipping;
  const orderId = "AI-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  // 5) Optional shipping address captured in the checkout form.
  const s = body.shipTo;
  const shipTo: ShippingAddress | undefined =
    s && s.name && s.address1 && s.city && s.postal && s.country
      ? {
          name: s.name, address1: s.address1,
          // Only include address2 when present — Firestore rejects `undefined`.
          ...(s.address2 ? { address2: s.address2 } : {}),
          city: s.city, postal: s.postal, country: s.country,
        }
      : undefined;

  const origin = publicOrigin(req);

  // 6) Create the Checkout Session first; only persist the pending order if it
  //    succeeds, so we never leave an orphan order with no way to pay.
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: email ?? body.email,
      client_reference_id: uid,
      metadata: { uid, orderId, kind: "cart" },
      payment_intent_data: { metadata: { uid, orderId } },
      shipping_options: hasPhysical
        ? [{
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: shippingFee * 100, currency: "usd" },
              display_name: "Studio shipping · insured",
            },
          }]
        : undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/confirmation?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?payment=cancelled`,
    });
  } catch {
    return bad("Could not start checkout. Please try again.", 500);
  }

  try {
    await adminCreatePendingOrder({
      id: orderId,
      userId: uid,
      email: email ?? body.email ?? "",
      items: orderItems,
      subtotal,
      shipping,
      total,
      status: "pending",
      createdAt: Date.now(),
      stripeSessionId: session.id,
      ...(shipTo ? { shipTo } : {}),
    });
  } catch {
    // The order record failed but the session exists — let the buyer pay; the
    // webhook can't recreate it, so surface a soft failure rather than charging
    // with no record.
    return bad("Could not prepare your order. Please try again.", 500);
  }

  // Save the shipping address to the buyer's profile so it pre-fills next time.
  // Best-effort — must never fail the checkout. Admin SDK bypasses rules.
  if (shipTo) {
    try {
      await adminDb.collection("users").doc(uid).set(
        { shipTo, updatedAt: Date.now() },
        { merge: true }
      );
    } catch {
      // Non-critical: the order is already placed; a failed address save is fine.
    }
  }

  return NextResponse.json({ url: session.url, orderId });
}
