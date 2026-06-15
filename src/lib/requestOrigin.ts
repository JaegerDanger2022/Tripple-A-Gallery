import type { NextRequest } from "next/server";

/**
 * The browser-reachable origin for building redirect URLs (Stripe success/cancel,
 * billing-portal return). Behind App Hosting's proxy the server binds to
 * 0.0.0.0:8080 internally, so req.nextUrl.origin is unreachable — prefer an
 * explicit NEXT_PUBLIC_SITE_URL, then the proxy's forwarded host, and only fall
 * back to the request's own origin (correct for local dev).
 */
export function publicOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("localhost")) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return req.nextUrl.origin;
}
