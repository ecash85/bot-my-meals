import { NextResponse } from "next/server";
import { supabaseBotCheckStatus } from "@/lib/supabase/repo";
import { createSupabaseForRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function statusJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const client = await createSupabaseForRequest(request);
  if (!client) return statusJson({ error: "unavailable" }, 503);

  try {
    const result = await supabaseBotCheckStatus(client);
    if (!result.ok) {
      const status = result.error === "unauthorized" ? 401 : 404;
      return statusJson({ error: result.error }, status);
    }
    return statusJson(result.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unavailable";
    return statusJson({ error: message }, 500);
  }
}
