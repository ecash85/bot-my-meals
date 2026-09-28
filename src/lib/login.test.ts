import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { grokPromptPaste } from "./install-docs";
import {
  authCallbackRedirectPath,
  legacyAuthCallbackUrl,
  LOGIN_CALLBACK_FAILED_COPY,
  LOGIN_HELPER,
  LOGIN_INTRO,
  OTP_DIFFERENT,
  OTP_ERROR_INVALID,
  OTP_ERROR_OFFLINE,
  OTP_ERROR_RATE_LIMIT,
  OTP_ERROR_SEND_FAILED,
  OTP_RESEND,
  OTP_SEND,
  OTP_TITLE,
  OTP_VERIFY,
  loginCallbackFailedMessage,
  loginCallbackFailedPath,
  otpCodeFromInput,
  otpFailureMessage,
  otpOriginLine,
  otpSentBody,
  safeAuthNext,
} from "./login";

const srcRoot = path.resolve(import.meta.dirname, "..");

describe("email OTP sign-in copy", () => {
  it("locks Send code and the in-app code screen", () => {
    expect(LOGIN_INTRO).toBe("Sign in with a code we email you.");
    expect(LOGIN_HELPER).toBe(
      "We’ll email a 6-digit code. Enter it here — you can stay in this app.",
    );
    expect(OTP_SEND).toBe("Send code");
    expect(OTP_TITLE).toBe("Enter your code");
    expect(otpSentBody("alex@example.com")).toBe("We sent a code to alex@example.com.");
    expect(OTP_VERIFY).toBe("Verify");
    expect(OTP_RESEND).toBe("Resend code");
    expect(OTP_DIFFERENT).toBe("Use a different email");
    expect(otpOriginLine("https://bot-my-meals.example.workers.dev")).toBe(
      "This code signs you in on https://bot-my-meals.example.workers.dev.",
    );
    expect(otpCodeFromInput("12-34 56")).toBe("123456");
    expect(otpCodeFromInput("12345678")).toBe("123456");

    const login = readFileSync(path.join(srcRoot, "components/login-home.tsx"), "utf8");
    const form = readFileSync(path.join(srcRoot, "components/email-otp-form.tsx"), "utf8");
    const provider = readFileSync(path.join(srcRoot, "components/supper-provider.tsx"), "utf8");

    expect(login).toContain("BrandMark");
    expect(login).toContain("EmailOtpForm");
    expect(login).not.toContain("Email me a sign-in link");
    expect(login).not.toContain("CheckEmailCard");
    expect(login).not.toMatch(/Safari/);
    expect(login).not.toMatch(/grandma/i);
    expect(form).toContain("OTP_SEND");
    expect(form).toContain("OTP_VERIFY");
    expect(form).toContain("OTP_TITLE");
    expect(form).toContain('aria-label="Email address"');
    expect(form).toContain('aria-label="6-digit code"');
    expect(form).toContain('inputMode="numeric"');
    expect(form).toContain('autoComplete="one-time-code"');
    expect(form).toContain("verifyEmailOtp");
    expect(form).toContain('variant="ghost"');
    expect(form).not.toContain("Email me a sign-in link");
    expect(form).not.toMatch(/Safari/);
    expect(form).not.toMatch(/grandma/i);
    expect(form).not.toContain("Link sent");
    expect(provider).toContain("signInWithOtp");
    expect(provider).toContain('type: "email"');
    expect(provider).toContain("verifyOtp");
    expect(provider).not.toContain("signInMagicLink");
    expect(provider).not.toContain("localStorage");
  });

  it("maps failures to one short line", () => {
    expect(OTP_ERROR_INVALID).toBe("That code didn’t work. Try again or resend.");
    expect(OTP_ERROR_RATE_LIMIT).toBe("Wait a minute, then resend.");
    expect(OTP_ERROR_SEND_FAILED).toBe("Couldn’t send a code. Check the email and try again.");
    expect(OTP_ERROR_OFFLINE).toBe("You’re offline. Try again when you’re back.");

    expect(otpFailureMessage("verify", { message: "Token has expired or is invalid" })).toBe(
      OTP_ERROR_INVALID,
    );
    expect(otpFailureMessage("send", { status: 429, message: "Email rate limit exceeded" })).toBe(
      OTP_ERROR_RATE_LIMIT,
    );
    expect(
      otpFailureMessage("send", { code: "over_email_send_rate_limit", message: "slow down" }),
    ).toBe(OTP_ERROR_RATE_LIMIT);
    expect(otpFailureMessage("send", new TypeError("Failed to fetch"))).toBe(OTP_ERROR_OFFLINE);
    expect(otpFailureMessage("send", new Error("boom"), false)).toBe(OTP_ERROR_OFFLINE);
    expect(otpFailureMessage("send", { message: "Unable to validate email address" })).toBe(
      OTP_ERROR_SEND_FAILED,
    );
    expect(otpFailureMessage("send", { message: "Token has expired or is invalid" })).not.toMatch(
      /Safari|Gmail|grandma/i,
    );
  });
});

describe("auth callback failure surface", () => {
  it("sends a failed or missing exchange to the code form", () => {
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
    ).toBe("/login?error=auth");
    expect(
      authCallbackRedirectPath({
        next: "/join/abc123def456",
        code: "pkce-code",
        exchangeFailed: false,
      }),
    ).toBe("/join/abc123def456");
  });

  it("keeps a legacy callback next on-site so join can still return", () => {
    expect(safeAuthNext("/join/abc123def456")).toBe("/join/abc123def456");
    expect(safeAuthNext("//evil.example")).toBe("/week");
    expect(safeAuthNext("https://evil.example")).toBe("/week");
    expect(safeAuthNext(undefined)).toBe("/week");
    expect(legacyAuthCallbackUrl("https://bot-my-meals.example.workers.dev", "/week")).toBe(
      "https://bot-my-meals.example.workers.dev/auth/callback",
    );
    expect(
      legacyAuthCallbackUrl("https://bot-my-meals.example.workers.dev/", "/join/abc123def456"),
    ).toBe("https://bot-my-meals.example.workers.dev/auth/callback?next=%2Fjoin%2Fabc123def456");
  });

  it("shows a short reason on /login for ?error=auth", () => {
    expect(LOGIN_CALLBACK_FAILED_COPY).toBe(
      "Sign-in didn’t finish. Send a new code on this phone.",
    );
    expect(LOGIN_CALLBACK_FAILED_COPY).not.toMatch(/Safari|Gmail|grandma/i);
    expect(loginCallbackFailedMessage("auth")).toBe(LOGIN_CALLBACK_FAILED_COPY);
    expect(loginCallbackFailedMessage(["auth"])).toBe(LOGIN_CALLBACK_FAILED_COPY);
    expect(loginCallbackFailedMessage("other")).toBeNull();
    expect(loginCallbackFailedMessage(undefined)).toBeNull();

    const loginPage = readFileSync(path.join(srcRoot, "app/login/page.tsx"), "utf8");
    const loginHome = readFileSync(path.join(srcRoot, "components/login-home.tsx"), "utf8");
    const form = readFileSync(path.join(srcRoot, "components/email-otp-form.tsx"), "utf8");
    const callback = readFileSync(path.join(srcRoot, "app/auth/callback/route.ts"), "utf8");
    const client = readFileSync(path.join(srcRoot, "lib/supabase/client.ts"), "utf8");

    expect(loginPage).toContain("loginCallbackFailedMessage");
    expect(loginPage).toContain("callbackError");
    expect(loginHome).toContain("callbackError");
    expect(form).toContain('role="alert"');
    expect(callback).toContain("authCallbackRedirectPath");
    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("exchangeFailed");
    expect(callback).not.toMatch(/await supabase\.auth\.exchangeCodeForSession\(code\);\s*\}/);
    expect(client).toContain("createBrowserClient");
    expect(client).toContain("supabaseAuthCookieOptions");
    expect(client).not.toContain("localStorage");
  });
});

describe("install paste for OTP", () => {
  it("documents SMTP and {{ .Token }} and does not teach a mail-link happy path", () => {
    const readme = readFileSync(path.join(srcRoot, "../README.md"), "utf8");
    const domains = readFileSync(path.join(srcRoot, "../docs/domains.md"), "utf8");
    const paste = grokPromptPaste(readme);
    for (const doc of [readme, domains, paste]) {
      expect(doc).toMatch(/\{\{ \.Token \}\}/);
      expect(doc).toMatch(/custom SMTP/);
      expect(doc).toMatch(/Send code/);
      expect(doc).toMatch(/Verify/);
      expect(doc).not.toMatch(/Email me a sign-in link/);
      expect(doc).not.toMatch(/Enable Email magic link/);
      expect(doc).not.toMatch(/Gmail’s in-app browser/);
      expect(doc).not.toMatch(/grandma/i);
    }
    expect(readme).toMatch(/Email OTP/);
    expect(readme).toMatch(/auth\/callback/);
    expect(readme).toContain('id="grok-prompt"');
    expect(domains).toMatch(/Email OTP/);
    expect(domains).toMatch(/Site URL/);
    expect(paste).toMatch(/Email OTP/);
    expect(paste).toMatch(/not magic-link-only/);
    expect(paste).toMatch(/easy for anyone/);
    expect(paste).toMatch(/cart adds only where the store actually supports them/);
    expect(paste).toMatch(/Do NOT invent prices/);
  });
});
