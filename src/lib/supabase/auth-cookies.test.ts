import { describe, expect, it } from "vitest";
import {
  cookieSecureFromLocation,
  cookieSecureFromProto,
  supabaseAuthCookieOptions,
} from "./auth-cookies";

describe("supabase auth cookies", () => {
  it("uses SameSite=Lax and Secure on HTTPS, not localStorage", () => {
    expect(supabaseAuthCookieOptions(true)).toMatchObject({
      path: "/",
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    });
    expect(supabaseAuthCookieOptions(false).secure).toBe(false);
    expect(cookieSecureFromLocation("https:")).toBe(true);
    expect(cookieSecureFromLocation("http:")).toBe(false);
    expect(cookieSecureFromProto("https")).toBe(true);
    expect(cookieSecureFromProto("HTTPS, http")).toBe(true);
    expect(cookieSecureFromProto("http")).toBe(false);
  });
});