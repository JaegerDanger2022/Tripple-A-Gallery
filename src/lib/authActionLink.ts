/**
 * Rebuild a Firebase-generated email-action link onto our own domain. The Admin
 * SDK returns a link on *.firebaseapp.com; we only want its `oobCode` and point
 * it at our branded /auth/action handler instead. Returns null if no code.
 */
export function ownActionLink(origin: string, firebaseLink: string, mode: string): string | null {
  let code: string | null = null;
  try {
    code = new URL(firebaseLink).searchParams.get("oobCode");
  } catch {
    code = null;
  }
  return code ? `${origin}/auth/action?mode=${mode}&oobCode=${encodeURIComponent(code)}` : null;
}
