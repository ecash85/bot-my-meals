import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HOUSEHOLD_NOT_VISIBLE,
  fetchSupabaseSession,
  supabaseCreateHousehold,
} from "./repo";

const user = {
  id: "user-1",
  email: "admin@example.com",
  user_metadata: { display_name: "admin" },
};

function createClient(options: {
  rpc?: (fn: string, args?: { household_name?: string }) => Promise<{ data: unknown; error: { message: string } | null }>;
  membership?: { data: { id: string; household_id: string; role: string; display_name: string; email: string } | null; error: { message: string } | null };
}): SupabaseClient {
  const rpc = options.rpc ?? (async () => ({ data: "hid", error: null }));
  const membership = options.membership ?? {
    data: {
      id: "mem-1",
      household_id: "hid",
      role: "owner",
      display_name: "admin",
      email: "admin@example.com",
    },
    error: null,
  };

  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    rpc,
    from: (table: string) => {
      if (table !== "memberships") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => membership,
              }),
            }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe("supabaseCreateHousehold", () => {
  it("rejects an empty name instead of inserting NULL", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    await expect(supabaseCreateHousehold(createClient({ rpc }), "   ")).rejects.toThrow(
      "Give the household a name.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces RPC failures instead of succeeding silently", async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === "create_household") {
        return { data: null, error: { message: "Not authenticated" } };
      }
      return { data: null, error: null };
    });
    await expect(supabaseCreateHousehold(createClient({ rpc }), "Home")).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("surfaces the RLS read failure that made Create household look dead", async () => {
    const rpc = vi.fn(async (fn: string, args?: { household_name?: string }) => {
      if (fn === "create_household") {
        expect(args).toEqual({ household_name: "Home" });
        return { data: "hid", error: null };
      }
      return { data: null, error: null };
    });
    await expect(
      supabaseCreateHousehold(
        createClient({
          rpc,
          membership: {
            data: null,
            error: { message: "permission denied for schema private" },
          },
        }),
        "Home",
      ),
    ).rejects.toThrow("permission denied for schema private");
  });

  it("does not treat a successful insert as done when the household is still invisible", async () => {
    await expect(
      supabaseCreateHousehold(
        createClient({
          membership: { data: null, error: null },
        }),
        "Home",
      ),
    ).rejects.toThrow(HOUSEHOLD_NOT_VISIBLE);
  });

  it("accepts a valid name when the new household is readable", async () => {
    await expect(supabaseCreateHousehold(createClient({}), "Home")).resolves.toBeUndefined();
  });
});

describe("fetchSupabaseSession", () => {
  it("does not swallow membership read errors as 'no household yet'", async () => {
    await expect(
      fetchSupabaseSession(
        createClient({
          membership: {
            data: null,
            error: { message: "permission denied for schema private" },
          },
        }),
      ),
    ).rejects.toThrow("permission denied for schema private");
  });
});
