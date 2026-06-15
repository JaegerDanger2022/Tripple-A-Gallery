// Transactional email — queued for the Firebase "Trigger Email" extension by
// writing a document to the mail collection (the extension watches it and sends
// via the configured SMTP backend). Server-only: uses the Admin SDK.
//
// Branding mirrors the Firebase Auth templates in src/emails/*.html (Cormorant
// Garamond display, Geist body, #7a3b2e accent, Tripple A Gallery shell).
import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { TIER_LABELS } from "./tier";
import type { Order, OrderItem, Tier } from "./types";

// Collection the Trigger Email extension is configured to watch (default "mail").
const MAIL_COLLECTION = process.env.MAIL_COLLECTION ?? "mail";
// Optional explicit sender — otherwise the extension's configured default is used.
const FROM = process.env.MAIL_FROM;
const REPLY_TO = process.env.MAIL_REPLY_TO ?? "info@trippleagallery.com";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) || "https://trippleagallery.com";

interface QueueEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Enqueue one email for the Trigger Email extension to deliver. Best-effort:
 *  callers should not let a mail failure break their main flow. */
export async function queueEmail({ to, subject, html, text }: QueueEmailInput): Promise<void> {
  if (!to) return;
  await adminDb.collection(MAIL_COLLECTION).add({
    to,
    ...(FROM ? { from: FROM } : {}),
    replyTo: REPLY_TO,
    message: { subject, html, text },
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ── Branded HTML shell ───────────────────────────────────────────────────────

function money(n: number): string {
  return "£" + n.toLocaleString("en-GB");
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

interface LayoutInput {
  eyebrow: string;
  heading: string;
  bodyHtml: string;        // pre-built, already-escaped inner HTML
  ctaLabel?: string;
  ctaHref?: string;
}

function layout({ eyebrow, heading, bodyHtml, ctaLabel, ctaHref }: LayoutInput): string {
  const cta = ctaLabel && ctaHref
    ? `<div class="cta-wrap"><a href="${ctaHref}" class="cta-button">${esc(ctaLabel)}</a></div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(heading)} — Tripple A Gallery</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Geist:wght@300;400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background-color:#ede9e2; font-family:'Geist','Helvetica Neue',Arial,sans-serif; font-weight:300; color:#1a1a1a; }
  .email-wrapper { width:100%; padding:48px 16px; background-color:#ede9e2; }
  .email-card { max-width:560px; margin:0 auto; background-color:#f6f4ef; border:1px solid rgba(26,26,26,0.10); }
  .header { padding:40px 48px 32px; border-bottom:1px solid rgba(26,26,26,0.10); text-align:center; }
  .logo-mark { display:inline-block; width:44px; height:44px; background-color:#f5f0ea; border-radius:8px; text-align:center; line-height:52px; font-family:'Cormorant Garamond',Georgia,serif; font-style:italic; font-size:36px; color:#7a3b2e; margin-bottom:16px; }
  .brand-name { font-family:'Cormorant Garamond',Georgia,serif; font-size:13px; font-weight:400; letter-spacing:0.18em; text-transform:uppercase; color:#6b675e; }
  .body { padding:48px 48px 40px; }
  .eyebrow { font-size:10px; font-weight:400; letter-spacing:0.16em; text-transform:uppercase; color:#7a3b2e; margin-bottom:16px; }
  .heading { font-family:'Cormorant Garamond',Georgia,serif; font-size:32px; font-weight:300; font-style:italic; line-height:1.2; color:#1a1a1a; margin-bottom:24px; }
  .body-text { font-size:14px; font-weight:300; line-height:1.7; color:#3d3a34; margin-bottom:16px; }
  .summary { width:100%; border-collapse:collapse; margin:8px 0 24px; }
  .summary th { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#6b675e; text-align:left; font-weight:400; padding:0 0 10px; border-bottom:1px solid rgba(26,26,26,0.10); }
  .summary td { font-size:13px; font-weight:300; color:#3d3a34; padding:12px 0; border-bottom:1px solid rgba(26,26,26,0.08); vertical-align:top; }
  .summary .num { text-align:right; white-space:nowrap; }
  .totals { width:100%; border-collapse:collapse; margin:0 0 28px; }
  .totals td { font-size:13px; font-weight:300; color:#3d3a34; padding:6px 0; }
  .totals .num { text-align:right; white-space:nowrap; }
  .totals .grand td { font-size:15px; font-weight:400; color:#1a1a1a; padding-top:12px; border-top:1px solid rgba(26,26,26,0.14); }
  .panel { background-color:#f0ede6; border-left:2px solid #7a3b2e; padding:16px 20px; margin-bottom:24px; }
  .panel-label { font-size:10px; font-weight:400; letter-spacing:0.12em; text-transform:uppercase; color:#6b675e; margin-bottom:8px; }
  .panel-text { font-size:13px; font-weight:300; color:#3d3a34; line-height:1.7; }
  .cta-wrap { padding:8px 0; }
  .cta-button { display:inline-block; background-color:#7a3b2e; color:#f6f4ef !important; text-decoration:none; font-family:'Geist','Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:400; letter-spacing:0.14em; text-transform:uppercase; padding:14px 36px; }
  .footer { padding:28px 48px 36px; border-top:1px solid rgba(26,26,26,0.10); }
  .footer-text { font-size:11px; font-weight:300; color:#6b675e; line-height:1.7; text-align:center; }
  .footer-text a { color:#6b675e; text-decoration:underline; }
  .footer-address { margin-top:12px; font-size:10px; letter-spacing:0.06em; color:#9e9a92; text-align:center; line-height:1.8; }
  @media only screen and (max-width:600px) { .header{padding:32px 28px 24px;} .body{padding:36px 28px 32px;} .footer{padding:24px 28px 32px;} .heading{font-size:26px;} }
</style></head>
<body><div class="email-wrapper">
  <table class="email-card" role="presentation" cellspacing="0" cellpadding="0" width="100%">
    <tr><td class="header"><div class="logo-mark">A</div><div class="brand-name">Tripple A Gallery</div></td></tr>
    <tr><td class="body">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h1 class="heading">${esc(heading)}</h1>
      ${bodyHtml}
      ${cta}
    </td></tr>
    <tr><td class="footer">
      <p class="footer-text">Questions about your order? <a href="mailto:info@trippleagallery.com">info@trippleagallery.com</a></p>
      <p class="footer-address">Tripple A Gallery &nbsp;·&nbsp; 167–169 Great Portland Street &nbsp;·&nbsp; London W1W 5PF</p>
    </td></tr>
  </table>
</div></body></html>`;
}

// ── Order confirmation ───────────────────────────────────────────────────────

function itemRowHtml(it: OrderItem): string {
  const frame = it.frameLabel && !["Unframed", "Digital file"].includes(it.frameLabel)
    ? ` · ${esc(it.frameLabel)}` : "";
  const qty = it.qty > 1 ? ` · ×${it.qty}` : "";
  return `<tr><td>${esc(it.variantLabel)}${frame}${qty}<br>
    <span style="font-size:11px;color:#9e9a92;letter-spacing:0.04em;">Lot ${esc(it.lotNumber || "—")}${it.isDigital ? " · digital download" : ""}</span></td>
    <td class="num">${money(it.price * it.qty)}</td></tr>`;
}

export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  const date = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const hasDigital = order.items.some((it) => it.isDigital);
  const ship = order.shipTo;

  const rows = order.items.map(itemRowHtml).join("");
  const shipLine = order.shipping > 0
    ? `<tr><td>Shipping · insured</td><td class="num">${money(order.shipping)}</td></tr>`
    : `<tr><td>Digital — no shipping</td><td class="num">£0</td></tr>`;

  const addressPanel = ship
    ? `<div class="panel"><p class="panel-label">Shipping to</p><p class="panel-text">
        ${esc(ship.name)}<br>${esc(ship.address1)}${ship.address2 ? "<br>" + esc(ship.address2) : ""}<br>
        ${esc(ship.city)}, ${esc(ship.postal)}<br>${esc(ship.country)}</p></div>`
    : "";

  const digitalPanel = hasDigital
    ? `<div class="panel"><p class="panel-label">Your digital downloads</p><p class="panel-text">
        Your high-resolution file(s) are ready. Sign in and open <strong style="font-weight:400;">Your account → Purchase activity</strong> to download them anytime.</p></div>`
    : "";

  const bodyHtml = `
    <p class="body-text">Thank you for your order. A summary is below — we'll send a tracking note as soon as any physical pieces leave the studio.</p>
    <table class="summary" role="presentation" cellspacing="0" cellpadding="0">
      <tr><th>Order ${esc(order.id)} · ${esc(date)}</th><th class="num">Amount</th></tr>
      ${rows}
    </table>
    <table class="totals" role="presentation" cellspacing="0" cellpadding="0">
      <tr><td>Subtotal</td><td class="num">${money(order.subtotal)}</td></tr>
      ${shipLine}
      <tr class="grand"><td>Total</td><td class="num">${money(order.total)}</td></tr>
    </table>
    ${addressPanel}
    ${digitalPanel}`;

  const html = layout({
    eyebrow: "Order Confirmed",
    heading: "Thank you — your order is confirmed",
    bodyHtml,
    ctaLabel: "View your orders",
    ctaHref: `${SITE_URL}/account`,
  });

  const textLines = [
    `Tripple A Gallery — order confirmed`,
    ``,
    `Order ${order.id} · ${date}`,
    ...order.items.map((it) => `  • Lot ${it.lotNumber || "—"} — ${it.variantLabel}${it.qty > 1 ? ` ×${it.qty}` : ""} — ${money(it.price * it.qty)}`),
    ``,
    `Subtotal: ${money(order.subtotal)}`,
    order.shipping > 0 ? `Shipping: ${money(order.shipping)}` : `Shipping: none (digital)`,
    `Total: ${money(order.total)}`,
    ``,
    ship ? `Shipping to: ${ship.name}, ${ship.address1}, ${ship.city}, ${ship.postal}, ${ship.country}` : ``,
    hasDigital ? `Digital downloads are available in Your account → Purchase activity.` : ``,
    ``,
    `View your orders: ${SITE_URL}/account`,
  ].filter(Boolean);

  await queueEmail({ to: order.email, subject: `Your Tripple A Gallery order ${order.id}`, html, text: textLines.join("\n") });
}

// ── Subscription / membership changes ────────────────────────────────────────

export type TierChangeKind = "welcome" | "upgrade" | "downgrade" | "cancelled";

/** Classify a tier transition into the right email (null = nothing to send). */
export function classifyTierChange(from: Tier, to: Tier): TierChangeKind | null {
  if (from === to) return null;
  if (to === 0) return "cancelled";
  if (from === 0) return "welcome";
  return to > from ? "upgrade" : "downgrade";
}

const COPY: Record<TierChangeKind, { eyebrow: string; heading: string; intro: string; cta: string; href: string }> = {
  welcome:   { eyebrow: "Membership", heading: "Welcome to your membership", intro: "Your membership is active — thank you for supporting the studio. Here's the access you now have:", cta: "Explore the collection", href: "/" },
  upgrade:   { eyebrow: "Membership", heading: "Your membership has been upgraded", intro: "Your access has been upgraded. Here's where things stand now:", cta: "Explore the collection", href: "/" },
  downgrade: { eyebrow: "Membership", heading: "Your membership has been updated", intro: "Your plan has changed. Your access has been adjusted to:", cta: "View your account", href: "/account" },
  cancelled: { eyebrow: "Membership", heading: "Your membership has been cancelled", intro: "Your membership has ended and your access has returned to the free tier. You can resubscribe anytime — the works originally in your collection remain available.", cta: "See membership options", href: "/pricing" },
};

export async function sendTierChangeEmail(email: string, from: Tier, to: Tier): Promise<void> {
  const kind = classifyTierChange(from, to);
  if (!kind || !email) return;
  const c = COPY[kind];

  const accessPanel = kind === "cancelled"
    ? `<div class="panel"><p class="panel-label">Current access</p><p class="panel-text">${esc(TIER_LABELS[0])}</p></div>`
    : `<div class="panel"><p class="panel-label">Your access</p><p class="panel-text">${esc(TIER_LABELS[to])}</p></div>`;

  const manageNote = kind === "cancelled"
    ? ""
    : `<p class="body-text" style="font-size:13px;color:#6b675e;">You can review or change your plan anytime under <strong style="font-weight:400;">Your account → Membership → Manage billing</strong>.</p>`;

  const bodyHtml = `<p class="body-text">${esc(c.intro)}</p>${accessPanel}${manageNote}`;

  const html = layout({
    eyebrow: c.eyebrow,
    heading: c.heading,
    bodyHtml,
    ctaLabel: c.cta,
    ctaHref: `${SITE_URL}${c.href}`,
  });

  const text = [
    `Tripple A Gallery — ${c.heading}`,
    ``,
    c.intro,
    ``,
    kind === "cancelled" ? `Current access: ${TIER_LABELS[0]}` : `Your access: ${TIER_LABELS[to]}`,
    ``,
    `${c.cta}: ${SITE_URL}${c.href}`,
  ].join("\n");

  const subjectByKind: Record<TierChangeKind, string> = {
    welcome: "Your Tripple A Gallery membership is active",
    upgrade: "Your Tripple A Gallery membership has been upgraded",
    downgrade: "Your Tripple A Gallery membership has been updated",
    cancelled: "Your Tripple A Gallery membership has been cancelled",
  };

  await queueEmail({ to: email, subject: subjectByKind[kind], html, text });
}
