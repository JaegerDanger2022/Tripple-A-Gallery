import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebaseAdmin";
import type { Order } from "@/lib/types";

// This route touches the Admin SDK + Storage — must run on Node, never edge,
// and must not be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

function unauthorized(msg: string) {
  return NextResponse.json({ error: msg }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const artworkId = req.nextUrl.searchParams.get("artworkId");
  if (!artworkId) {
    return NextResponse.json({ error: "Missing artworkId" }, { status: 400 });
  }

  // 1) Verify the caller's Firebase ID token.
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return unauthorized("Sign in to download.");

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return unauthorized("Your session has expired. Sign in again.");
  }

  // 2) Confirm this user actually purchased a digital download of this artwork.
  const snap = await adminDb
    .collection("orders")
    .where("userId", "==", uid)
    .get();

  const owns = snap.docs.some((d) => {
    const order = d.data() as Order;
    return (order.items ?? []).some(
      (it) => it.isDigital && it.artworkId === artworkId
    );
  });

  if (!owns) {
    return NextResponse.json(
      { error: "No digital purchase found for this work." },
      { status: 403 }
    );
  }

  // 3) Look up the artwork's private hi-res file path.
  const artDoc = await adminDb.collection("artworks").doc(artworkId).get();
  const hiResPath = artDoc.exists ? (artDoc.data()?.hiResPath as string | undefined) : undefined;
  if (!hiResPath) {
    return NextResponse.json(
      { error: "Digital file is not available yet. Please contact the studio." },
      { status: 404 }
    );
  }

  // 4) Issue a short-lived signed URL. Returned as JSON so the client can
  //    navigate the browser straight to it (no double-fetch of the bytes).
  try {
    const file = adminStorage.bucket().file(hiResPath);
    const downloadName = `${artworkId}-hi-res`.replace(/[^\w.\-]+/g, "_");
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_TTL_MS,
      responseDisposition: `attachment; filename="${downloadName}"`,
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Could not prepare the download. Please try again." },
      { status: 500 }
    );
  }
}
