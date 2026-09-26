import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  authCallbackRedirectPath,
  CHECK_EMAIL_DIFFERENT,
  CHECK_EMAIL_HELPER,
  CHECK_EMAIL_RESEND,
  CHECK_EMAIL_TITLE,
  LOGIN_CALLBACK_FAILED_COPY,
  LOGIN_SAME_DEVICE_COPY,
  LOGIN_SAME_DEVICE_HELPER,
  checkEmailBody,
  loginCallbackFailedMessage,
  loginCallbackFailedPath,
  safeAuthNext,
} from "./login";

const srcRoot = path.resolve(import.meta.dirname, "..");

describe("login same-device magic-link copy", () => {
  it("keeps the UX-approved same-phone instruction on LoginHome", () => {
    expect(LOGIN_SAME_DEVICE_COPY).toBe(
      "Request the link on this phone, then open the email on this same phone.",
    );
    expect(LOGIN_SAME_DEVICE_HELPER).toBe(
      "Opening the link on another device sends you back here.",
    );

    const login = readFileSync(path.join(srcRoot, "components/login-home.tsx"), "utf8");
    expect(login).toContain("LOGIN_SAME_DEVICE_COPY");
    expect(login).toContain("LOGIN_SAME_DEVICE_HELPER");
    expect(login).toContain("Email me a sign-in link");
    expect(login).toContain("CheckEmailCard");
    expect(login).not.toContain("Link sent");
    expect(CHECK_EMAIL_TITLE).toBe("Check your email");
    expect(checkEmailBody("alex@example.com")).toMatch(/alex@example.com/);
    expect(CHECK_EMAIL_HELPER).toBe(
      "Opening the link on another device sends you back here.",
    );
    expect(checkEmailBody("alex@example.com")).toMatch(/same phone/);
    expect(checkEmailBody("alex@example.com")).toMatch(/Safari/);
    expect(CHECK_EMAIL_RESEND).toBe("Resend");
    expect(CHECK_EMAIL_DIFFERENT).toBe("Use a different email");
  });
});

describe("auth callback failure surface", () => {
  it("sends a failed exchange to /login?error=auth instead of /week", () => {
    expect(loginCallbackFailedPath()).toBe("/login?error=auth");
    expect(
      authCallbackRedirectPath({
        next: "/week",
        code: "pkce-code",
        exchangeFailed: true,
      }),
    ).toBe("/login?error=auth");
    expect(
      authCallbackRedirectPath({
        next: "/week",
        code: "pkce-code",
        exchangeFailed: false,
      }),
    ).toBe("/week");
    expect(
      authCallbackRedirectPath({
        next: "/recipes",
        code: "pkce-code",
        exchangeFailed: false,
      }),
    ).toBe("/recipes");
    expect(
      authCallbackRedirectPath({
        next: "/week",
        code: null,
        exchangeFailed: false,
      }),
    ).toBe("/week");
    expect(
      authCallbackRedirectPath({
        next: "/join/abc123def456",
        code: "pkce-code",
        exchangeFailed: false,
      }),
    ).toBe("/join/abc123def456");
  });

  it("keeps auth next on-site so join tokens survive magic-link return", () => {
    expect(safeAuthNext("/join/abc123def456")).toBe("/join/abc123def456");
    expect(safeAuthNext("//evil.example")).toBe("/week");
    expect(safeAuthNext("https://evil.example")).toBe("/week");
    expect(safeAuthNext(undefined)).toBe("/week");
  });

  it("shows a grandma-easy reason on /login for ?error=auth", () => {
    expect(LOGIN_CALLBACK_FAILED_COPY).toBe(
      "Sign-in didn't finish on this browser. Request a new link on this phone and open it here (Safari, not Gmail's in-app browser).",
    );
    expect(loginCallbackFailedMessage("auth")).toBe(LOGIN_CALLBACK_FAILED_COPY);
    expect(loginCallbackFailedMessage(["auth"])).toBe(LOGIN_CALLBACK_FAILED_COPY);
    expect(loginCallbackFailedMessage("other")).toBeNull();
    expect(loginCallbackFailedMessage(undefined)).toBeNull();

    const loginPage = readFileSync(path.join(srcRoot, "app/login/page.tsx"), "utf8");
    const loginHome = readFileSync(path.join(srcRoot, "components/login-home.tsx"), "utf8");
    const callback = readFileSync(path.join(srcRoot, "app/auth/callback/route.ts"), "utf8");

    expect(loginPage).toContain("loginCallbackFailedMessage");
    expect(loginPage).toContain("callbackError");
    expect(loginHome).toContain("callbackError");
    expect(loginHome).toContain('role="alert"');
    expect(callback).toContain("authCallbackRedirectPath");
    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("exchangeFailed");
    expect(callback).not.toMatch(
      /await supabase\.auth\.exchangeCodeForSession\(code\);\s*\}/,
    );
  });
});
