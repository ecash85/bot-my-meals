import { NextResponse } from "next/server";
import { authCallbackRedirectPath } from "@/lib/login";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/week";
  const supabase = await createSupabaseServerClient();

  let exchangeFailed = false;
  if (code && supabase) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      exchangeFailed = Boolean(error);
    } catch {
      exchangeFailed = true;
    }
  }

  return NextResponse.redirect(
    new URL(authCallbackRedirectPath({ next, code, exchangeFailed }), origin),
  );
}
