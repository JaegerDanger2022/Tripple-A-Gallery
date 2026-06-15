import { NextRequest, NextResponse } from "next/server";
import { purgeUnverifiedUsers } from "@/lib/purgeUnverified";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete unverified accounts. Protected by a shared secret (PURGE_SECRET) so it
 * can be triggered either manually (one-shot) or by Cloud Scheduler (recurring).
 *
 *   POST /api/admin/purge-unverified            → unverified older than 24h
 *   POST /api/admin/purge-unverified?maxAgeHours=0  → ALL unverified now
 *   Header: Authorization: Bearer <PURGE_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PURGE_SECRET;
  if (!secret) return NextResponse.json({ error: "Purge is not configured." }, { status: 503 });

  const authz = req.headers.get("authorization") ?? "";
  const provided = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const param = req.nextUrl.searchParams.get("maxAgeHours");
  const maxAgeHours = param != null ? Math.max(0, Number(param) || 0) : 24;

  try {
    const result = await purgeUnverifiedUsers(maxAgeHours);
    return NextResponse.json({ ok: true, maxAgeHours, ...result });
  } catch {
    return NextResponse.json({ error: "Purge failed." }, { status: 500 });
  }
}
