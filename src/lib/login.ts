export const LOGIN_INTRO = "Sign in with a code we email you.";

export const LOGIN_HELPER =
  "We’ll email a 6-digit code. Enter it here — you can stay in this app.";

export const OTP_SEND = "Send code";
export const OTP_SENDING = "Sending…";

export const OTP_TITLE = "Enter your code";
export const OTP_VERIFY = "Verify";
export const OTP_VERIFYING = "Verifying…";
export const OTP_RESEND = "Resend code";
export const OTP_DIFFERENT = "Use a different email";

/** Supabase’s default email send spacing. The resend control stays quiet until this passes. */
export const OTP_RESEND_COOLDOWN_MS = 60_000;

export const OTP_ERROR_INVALID = "That code didn’t work. Try again or resend.";
export const OTP_ERROR_RATE_LIMIT = "Wait a minute, then resend.";
export const OTP_ERROR_SEND_FAILED = "Couldn’t send a code. Check the email and try again.";
export const OTP_ERROR_OFFLINE = "You’re offline. Try again when you’re back.";

export function otpSentBody(email: string): string {
  return `We sent a code to ${email}.`;
}

export function otpOriginLine(host: string): string {
  return `This code signs you in on ${host}.`;
}

export function otpCodeFromInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export const LOGIN_CALLBACK_ERROR_PARAM = "error";
export const LOGIN_CALLBACK_ERROR_VALUE = "auth";

export const LOGIN_CALLBACK_FAILED_COPY =
  "Sign-in didn’t finish. Send a new code on this phone.";

export function loginCallbackFailedPath(): string {
  return `/login?${LOGIN_CALLBACK_ERROR_PARAM}=${LOGIN_CALLBACK_ERROR_VALUE}`;
}

export function loginCallbackFailedMessage(
  errorParam: string | string[] | null | undefined,
): string | null {
  const value = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  return value === LOGIN_CALLBACK_ERROR_VALUE ? LOGIN_CALLBACK_FAILED_COPY : null;
}

export function safeAuthNext(next: string | string[] | null | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/week";
  }
  return value;
}

/** Legacy mail links only. The product path is the code typed in this app. */
export function legacyAuthCallbackUrl(origin: string, next?: string | null): string {
  const safe = safeAuthNext(next);
  const base = `${origin.replace(/\/$/, "")}/auth/callback`;
  if (safe === "/week") return base;
  return `${base}?next=${encodeURIComponent(safe)}`;
}

export function authCallbackRedirectPath({
  next,
  code,
  exchangeFailed,
}: {
  next: string;
  code: string | null;
  exchangeFailed: boolean;
}): string {
  if (!code || exchangeFailed) {
    return loginCallbackFailedPath();
  }
  return safeAuthNext(next);
}

type OtpFailureKind = "send" | "verify";

function readAuthFailure(err: unknown): { message: string; status?: number; code?: string } {
  if (!err || typeof err !== "object") {
    return { message: err instanceof Error ? err.message : "" };
  }
  const record = err as { message?: unknown; status?: unknown; code?: unknown };
  return {
    message: typeof record.message === "string" ? record.message : "",
    status: typeof record.status === "number" ? record.status : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
}

function isAuthRateLimited(status: number | undefined, code: string | undefined, message: string): boolean {
  const blob = `${code ?? ""} ${message}`.toLowerCase();
  return (
    status === 429 ||
    blob.includes("rate limit") ||
    blob.includes("too many") ||
    blob.includes("only request this after") ||
    blob.includes("over_email_send_rate_limit") ||
    blob.includes("over_request_rate_limit")
  );
}

function isAuthOffline(message: string): boolean {
  const blob = message.toLowerCase();
  return (
    blob.includes("failed to fetch") ||
    blob.includes("network") ||
    blob.includes("load failed") ||
    blob.includes("offline")
  );
}

export function otpFailureMessage(kind: OtpFailureKind, err: unknown, online = true): string {
  if (!online) return OTP_ERROR_OFFLINE;
  const { message, status, code } = readAuthFailure(err);
  if (isAuthRateLimited(status, code, message)) return OTP_ERROR_RATE_LIMIT;
  if (isAuthOffline(message)) return OTP_ERROR_OFFLINE;
  switch (kind) {
    case "send":
      return OTP_ERROR_SEND_FAILED;
    case "verify":
      return OTP_ERROR_INVALID;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
