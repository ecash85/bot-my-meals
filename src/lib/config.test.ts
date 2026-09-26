import { afterEach, describe, expect, it } from "vitest";
import {
  getPublicSupabaseConfig,
  getSupabaseSetupStatus,
  isSupabaseConfigured,
  isUsableAnonKey,
  isUsableSupabaseUrl,
} from "./config";

describe("public Supabase env", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  it("treats blank values as missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "  ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    expect(getSupabaseSetupStatus()).toBe("missing");
    expect(isSupabaseConfigured()).toBe(false);
    expect(getPublicSupabaseConfig()).toBeNull();
  });

  it("treats only one value as partial", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    expect(getSupabaseSetupStatus()).toBe("partial");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("rejects placeholders and non-URLs", () => {
    expect(isUsableSupabaseUrl("not-a-url")).toBe(false);
    expect(isUsableAnonKey("short")).toBe(false);
    expect(isUsableAnonKey("your-anon-key-goes-here-0000")).toBe(false);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "a-very-long-looking-anon-key";
    expect(getSupabaseSetupStatus()).toBe("invalid");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("accepts a real-looking URL and anon key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcd.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo";
    expect(isUsableSupabaseUrl("https://abcd.supabase.co")).toBe(true);
    expect(isUsableAnonKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo")).toBe(true);
    expect(getSupabaseSetupStatus()).toBe("ready");
    expect(isSupabaseConfigured()).toBe(true);
    expect(getPublicSupabaseConfig()).toEqual({
      url: "https://abcd.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo",
    });
  });
});
