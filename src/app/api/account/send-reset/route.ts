import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { sendResetEmail } from "@/lib/email";
import { ownActionLink } from "@/lib/authActionLink";
import { adminThrottle } from "@/lib/throttle";
import { publicOrigin } from "@/lib/requestOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send the branded password-reset email. UNAUTHENTICATED (forgot-password), so:
 *  • always returns ok — never reveals whether an account exists (no enumeration)
 *  • rate-limited per email to one send per 60s (replaces Firebase's built-in
 *    abuse protection, which we lose by sending the email ourselves)
 * The reset link is generated server-side and rebuilt onto /auth/action.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return NextResponse.json({ ok: true });

  // One reset email per address per minute.
  if (!(await adminThrottle(`reset:${email}`, 60_000))) return NextResponse.json({ ok: true });

  try {
    const fbLink = await adminAuth.generatePasswordResetLink(email);
    const link = ownActionLink(publicOrigin(req), fbLink, "resetPassword");
    if (link) await sendResetEmail(email, link);
  } catch {
    // user-not-found or any error → stay silent so existence isn't leaked.
  }
  return NextResponse.json({ ok: true });
}
