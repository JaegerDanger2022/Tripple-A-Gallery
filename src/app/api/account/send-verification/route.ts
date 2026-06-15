import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { sendVerificationEmail } from "@/lib/email";
import { ownActionLink } from "@/lib/authActionLink";
import { adminThrottle } from "@/lib/throttle";
import { publicOrigin } from "@/lib/requestOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send the branded verification email. Authenticated — the user just signed up
 * (or tried to sign in unverified), so we email the address on their own token.
 * The link is generated server-side and rebuilt onto /auth/action so it's fully
 * branded and on our domain (no Firebase template / no firebaseapp.com).
 */
export async function POST(req: NextRequest) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  let email: string | undefined;
  let verified = false;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? undefined;
    verified = decoded.email_verified === true;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Nothing to do if there's no email or it's already verified.
  if (!email || verified) return NextResponse.json({ ok: true, sent: false });
  // Soft cap resends (e.g. repeated sign-in attempts) to one per 30s per user.
  if (!(await adminThrottle(`verify:${uid}`, 30_000))) return NextResponse.json({ ok: true, sent: false });

  try {
    const fbLink = await adminAuth.generateEmailVerificationLink(email);
    const link = ownActionLink(publicOrigin(req), fbLink, "verifyEmail");
    if (link) await sendVerificationEmail(email, link);
  } catch {
    // Best-effort — never surface link/mail internals to the client.
  }
  return NextResponse.json({ ok: true, sent: true });
}
