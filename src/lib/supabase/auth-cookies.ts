import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Session cookies for @supabase/ssr. Not localStorage.
 * SameSite=Lax and Secure on HTTPS.
 * httpOnly stays false: Create account and Sign in write the session from the
 * browser client, and document.cookie cannot set HttpOnly. Server refresh uses
 * the same options so the installed app can still read the session.
 */
export function supabaseAuthCookieOptions(secure: boolean): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    secure,
    httpOnly: false,
  };
}

export function cookieSecureFromProto(proto: string | null | undefined): boolean {
  const forwarded = proto?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (forwarded === "https") return true;
  if (forwarded === "http") return false;
  return process.env.NODE_ENV === "production";
}

export function cookieSecureFromLocation(protocol: string | undefined): boolean {
  return protocol === "https:";
}
