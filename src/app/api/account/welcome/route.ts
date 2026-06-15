import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { adminClaimWelcomeEmail } from "@/lib/userAdmin";
import { sendWelcomeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the client right after account signup. Sends the branded welcome
 * email exactly once (claim is transactional, so retries/double-calls no-op).
 * Best-effort: a mail failure never blocks signup.
 */
export async function POST(req: NextRequest) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let uid: string;
  let email: string | undefined;
  let name: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? undefined;
    name = decoded.name ?? undefined;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!email) return NextResponse.json({ ok: true, sent: false });

  const claimed = await adminClaimWelcomeEmail(uid);
  if (claimed) {
    try { await sendWelcomeEmail(email, name); } catch { /* mail is non-critical */ }
  }
  return NextResponse.json({ ok: true, sent: claimed });
}
