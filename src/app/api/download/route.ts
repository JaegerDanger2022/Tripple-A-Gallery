import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebaseAdmin";
import type { Order } from "@/lib/types";

// This route touches the Admin SDK + Storage — must run on Node, never edge,
// and must not be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    if (!decoded.email_verified) {
      return NextResponse.json({ error: "Verify your email to download." }, { status: 403 });
    }
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
    // Only a paid (or later) order grants the download — never a pending or
    // cancelled checkout that was started but not paid.
    if (order.status === "pending" || order.status === "cancelled") return false;
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

  // 4) Stream the file's bytes straight back to the verified buyer. We deliberately
  //    do NOT mint a signed URL — that would create a shareable, time-limited link
  //    anyone could reuse. Streaming keeps every download behind this gate, where
  //    the token + purchase are checked on each request, and needs no signing
  //    permission (works on user ADC locally and the runtime SA in production).
  try {
    const file = adminStorage.bucket().file(hiResPath);
    const [buf] = await file.download();
    let contentType = "application/octet-stream";
    try {
      const [meta] = await file.getMetadata();
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      // Metadata is best-effort — fall back to a generic binary type.
    }
    const ext = hiResPath.includes(".") ? hiResPath.slice(hiResPath.lastIndexOf(".")) : "";
    const downloadName = `${artworkId}-hi-res${ext}`.replace(/[^\w.\-]+/g, "_");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not prepare the download. Please try again." },
      { status: 500 }
    );
  }
}
