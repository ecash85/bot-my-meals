import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { getPublicSupabaseConfig } from "@/lib/config";
import { cookieSecureFromProto, supabaseAuthCookieOptions } from "@/lib/supabase/auth-cookies";

export function bearerAccessToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export async function createSupabaseServerClient() {
  const config = getPublicSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  const headerStore = await headers();
  return createServerClient(
    config.url,
    config.anonKey,
    {
      cookieOptions: supabaseAuthCookieOptions(
        cookieSecureFromProto(headerStore.get("x-forwarded-proto")),
      ),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component; proxy.ts refreshes the session.
          }
        },
      },
    },
  );
}

/** Cookie session, or a household member access token for the bot's quiet wake. */
export async function createSupabaseForRequest(request: Request): Promise<SupabaseClient | null> {
  const config = getPublicSupabaseConfig();
  if (!config) return null;
  const token = bearerAccessToken(request);
  if (!token) return createSupabaseServerClient();
  return createClient(config.url, config.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
